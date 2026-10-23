import "server-only";

import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, rmdir, stat, unlink, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { Readable } from "node:stream";

import { VersionConflict, type StorageDriver, type StoredDoc, type StoredMedia } from "./driver";

/**
 * The local filesystem: data/*.json for documents, public/uploads for media.
 * This is what runs in development and on any host with a real disk.
 *
 * Writes go to a sibling temp file and are renamed over the target, because
 * rename(2) is atomic within a filesystem. A writeFile interrupted half way
 * leaves truncated JSON, which loses a collection rather than a row.
 *
 * The version is the file's modification time and size. It is not as strong as
 * an ETag -- two writes inside the same millisecond that produce the same
 * length would compare equal -- but it catches the case that matters, an edit
 * made against a document that has since been rewritten.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === "ENOENT";
}

function docPath(key: string): string {
  if (/^collections\/(images|blogs|slots|enquiries)\.json$/.test(key)) return path.join(DATA_DIR, path.basename(key));
  if (/^security\/(admin|rate-(auth|contact|recipient|mutation))\.json$/.test(key)) {
    return path.join(process.cwd(), ".security", path.basename(key));
  }
  throw new Error("Invalid document key.");
}

/** Refuse anything that is not a plain name directly inside the uploads folder. */
export function safeMediaPath(name: string): string | null {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,200}$/.test(name) || name.includes("..")) return null;
  const resolved = path.resolve(UPLOAD_DIR, name);
  if (path.dirname(resolved) !== path.resolve(UPLOAD_DIR)) return null;
  return resolved;
}

async function versionOf(target: string): Promise<string | null> {
  try {
    return createHash("sha256").update(await readFile(target)).digest("hex");
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

async function writeAtomic(target: string, body: Buffer | string): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, body, { mode: 0o600 });
    await rename(temp, target);
  } catch (error) {
    await unlink(temp).catch(() => {});
    throw error;
  }
}

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
};

export const fileSystemDriver: StorageDriver = {
  label: "the local file system",
  writable: true,

  async readDoc(key) {
    const target = docPath(key);
    try {
      const bytes = await readFile(target);
      return { text: bytes.toString("utf8"), version: createHash("sha256").update(bytes).digest("hex") };
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  },

  async writeDoc(key, text, expected) {
    const target = docPath(key);
    await mkdir(path.dirname(target), { recursive: true });
    const lock = `${target}.lock`;
    // Local development also needs cross-process CAS, including first creation.
    let locked = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { await mkdir(lock); locked = true; break; }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    if (!locked) throw new VersionConflict();
    try {
      if ((await versionOf(target)) !== expected) throw new VersionConflict();
      await writeAtomic(target, text);
    } finally { await rmdir(lock); }
  },

  async readMedia(name): Promise<StoredMedia | null> {
    const target = safeMediaPath(name);
    if (!target) return null;
    try {
      await stat(target);
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
    return {
      stream: Readable.toWeb(createReadStream(target)) as ReadableStream<Uint8Array>,
      contentType: CONTENT_TYPES[path.extname(target).toLowerCase()] ?? "application/octet-stream",
    };
  },

  async writeMedia(name, bytes) {
    const target = safeMediaPath(name);
    if (!target) throw new Error("That file name cannot be used.");
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeAtomic(target, bytes);
  },

  async deleteMedia(name) {
    const target = safeMediaPath(name);
    if (!target) return;
    try {
      await unlink(target);
    } catch (error) {
      // A missing file is the desired end state.
      if (!isMissing(error)) throw error;
    }
  },
};

export type { StoredDoc };

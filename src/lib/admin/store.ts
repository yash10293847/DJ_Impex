import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";

import { z } from "zod";

import { blogSchema, enquirySchema, imageSchema, slotSchema } from "./schemas";
import { blogSeed, enquirySeed, imageSeed, slotSeed } from "./seed";
import { storage, VersionConflict } from "./storage";
import { securityEvent } from "@/lib/security/errors";

/**
 * Collections of JSON documents, read and written through a storage driver:
 * the local filesystem in development, Vercel Blob in production. See
 * ./storage for why there are two.
 *
 * Every mutation goes through `mutate`, which reads, transforms and writes
 * under the document's version. If another writer got there first the write is
 * refused and the whole operation is retried against the new state, rather than
 * overwriting their change. That is the part an in-process lock cannot do once
 * the host runs more than one instance.
 *
 * The in-process queue is kept as well. It costs nothing and turns the common
 * case -- one operator clicking quickly -- into an ordered queue rather than a
 * sequence of conflicts and retries.
 */

export const UPLOAD_URL_BASE = "/media";

export type CollectionName = "images" | "blogs" | "enquiries" | "slots";

const definitions = {
  images: { schema: imageSchema, seed: imageSeed },
  blogs: { schema: blogSchema, seed: blogSeed },
  enquiries: { schema: enquirySchema, seed: enquirySeed },
  slots: { schema: slotSchema, seed: slotSeed },
} as const;

type Row<N extends CollectionName> = z.infer<(typeof definitions)[N]["schema"]>;

/** How many times a write may lose the race before the caller is told. */
const MAX_ATTEMPTS = 12;
const COLLECTION_LIMITS = { images: 2000, blogs: 1000, slots: 1000, enquiries: 5000 } as const;

/**
 * Wait a little before retrying a lost race, growing each time and jittered.
 *
 * Retrying immediately makes contention worse: every loser re-reads and
 * re-writes in the same instant and collides again. Measured against the real
 * Blob store with two independent server processes writing at once: five
 * immediate retries lost 1 of 12 writes to exhaustion, eight with backoff lost
 * 1 of 16, and twelve with backoff carried all 16. None of the lost ones was
 * overwritten silently -- each was refused with a 409 the caller can act on,
 * which is the property that actually matters.
 */
function backoff(attempt: number): Promise<void> {
  const base = Math.min(25 * 2 ** (attempt - 1), 400);
  return new Promise((resolve) => setTimeout(resolve, base * (0.5 + Math.random())));
}

/** Anything a caller can act on: a bad document, a refused write, a dead store. */
export class StoreError extends Error {
  readonly status: number;
  constructor(message: string, status = 500, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StoreError";
    this.status = status;
  }
}

function docKey(name: CollectionName): string {
  return `collections/${name}.json`;
}

function serialise(rows: unknown): string {
  return `${JSON.stringify(rows, null, 2)}\n`;
}

/** Parse and validate, so a hand-edited document fails loudly instead of rendering undefined. */
function parseRows<N extends CollectionName>(name: N, text: string): Row<N>[] {
  if (!text.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new StoreError(`${name}.json is not valid JSON, so it was left untouched.`, 500, {
      cause: error,
    });
  }

  const result = z.array(definitions[name].schema).safeParse(parsed);
  if (!result.success) {
    throw new StoreError(
      `${name}.json does not match the expected shape: ${z.prettifyError(result.error)}`,
      500,
    );
  }
  return result.data as Row<N>[];
}

type Loaded<N extends CollectionName> = { rows: Row<N>[]; version: string | null };

/** Read a collection, seeding it the first time it is asked for. */
async function load<N extends CollectionName>(name: N): Promise<Loaded<N>> {
  const driver = storage();
  let doc;
  try {
    doc = await driver.readDoc(docKey(name));
  } catch (error) {
    throw new StoreError(`Could not read ${name}.json from ${driver.label}.`, 500, { cause: error });
  }

  if (doc) return { rows: parseRows(name, doc.text), version: doc.version };

  const seeded = definitions[name].seed() as Row<N>[];
  try {
    await driver.writeDoc(docKey(name), serialise(seeded), null);
  } catch (error) {
    if (!(error instanceof VersionConflict)) throw new StoreError("The content store is unavailable.", 503);
  }
  // Re-read so the caller holds a version it can safely write against.
  const written = await driver.readDoc(docKey(name));
  if (!written) throw new StoreError("The content store is unavailable.", 503);
  return { rows: parseRows(name, written.text), version: written.version };
}

/** One promise chain per collection, to keep one operator's own edits in order. */
const chains = new Map<CollectionName, Promise<unknown>>();

function queue<T>(name: CollectionName, task: () => Promise<T>): Promise<T> {
  const previous = chains.get(name) ?? Promise.resolve();
  const next = previous.then(task, task);
  // Keep the chain alive past a rejection so one failure does not wedge the file.
  chains.set(
    name,
    next.catch(() => undefined),
  );
  return next;
}

export function readCollection<N extends CollectionName>(name: N): Promise<Row<N>[]> {
  return queue(name, async () => (await load(name)).rows);
}

/**
 * Read, transform and write a collection, retrying if the document moved under
 * us. The callback may run more than once and must not have side effects of
 * its own; it returns the next array plus whatever the caller wants back.
 */
export async function mutate<N extends CollectionName, R>(
  name: N,
  fn: (rows: Row<N>[]) => Promise<{ rows: Row<N>[]; result: R }> | { rows: Row<N>[]; result: R },
): Promise<R> {
  return queue(name, async () => {
    const driver = storage();

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const { rows, version } = await load(name);
      const { rows: next, result } = await fn(rows);
      if (next.length > Math.max(rows.length, COLLECTION_LIMITS[name])) {
        throw new StoreError("The collection has reached its storage limit.", 413);
      }

      // Validate the complete result before persisting; invalid writes must not
      // make every subsequent read of a collection fail.
      const validated = parseRows(name, serialise(next));
      const text = serialise(validated);
      if (Buffer.byteLength(text) > 8 * 1024 * 1024) throw new StoreError("The collection has reached its storage limit.", 413);
      try {
        await driver.writeDoc(docKey(name), text, version);
        return result;
      } catch (error) {
        if (error instanceof VersionConflict) {
          await backoff(attempt);
          continue;
        }
        throw new StoreError(
          `Could not save ${name}.json to ${driver.label}. The store may be read only.`,
          500,
          { cause: error },
        );
      }
    }

    throw new StoreError(
      `${name}.json is being changed faster than this edit could be applied. Nothing was saved, so please try again.`,
      409,
    );
  });
}

export function newId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export async function deleteUpload(fileName: string | null): Promise<void> {
  if (!fileName) return;
  try {
    await storage().deleteMedia(fileName);
  } catch {
    // The row is already gone; a leftover file is worth a line, not a failure.
    securityEvent("media_cleanup_failed");
  }
}

/** Store the bytes and return the name the row should carry. */
export async function saveUpload(originalName: string, bytes: Buffer, contentType: string): Promise<string> {
  const extension = path.extname(originalName).toLowerCase();
  const stem =
    path
      .basename(originalName, extension)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image";
  const fileName = `${randomUUID()}-${stem}${extension}`;

  try {
    await storage().writeMedia(fileName, bytes, contentType);
  } catch (error) {
    throw new StoreError(`Could not store the file on ${storage().label}.`, 500, { cause: error });
  }
  return fileName;
}

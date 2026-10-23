import { readMultipart } from "@/lib/security/request";
import { validateMedia } from "@/lib/security/upload";
import { guardAdminRequest } from "@/lib/admin/api";
import { fail, handleError, ok } from "@/lib/admin/api";
import { revalidateGallery } from "@/lib/admin/revalidate";
import { imageSchema, type AdminImage } from "@/lib/admin/schemas";
import {
  deleteUpload,
  mutate,
  newId,
  nowIso,
  readCollection,
  saveUpload,
  UPLOAD_URL_BASE,
} from "@/lib/admin/store";

export const dynamic = "force-dynamic";

/**
 * Below the host's own request body limit, which is about 4.5MB and enforced in
 * front of this route: a larger body never reaches here and comes back as plain
 * text the panel cannot read. The browser shrinks images before sending, so
 * this is the backstop rather than the thing a person normally meets.
 */
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/avif", ".avif"],
  ["image/gif", ".gif"],
  // No SVG. It is served from the site's own origin, and an SVG can carry
  // script, so an upload would be a stored cross-site scripting hole. It also
  // cannot pass through next/image without dangerouslyAllowSVG.
]);

export async function GET(request: Request) {
  try {
    await guardAdminRequest(request);
    const images = await readCollection("images");
    return ok({ images });
  } catch (error) {
    return handleError("images:list", error);
  }
}

/** Multipart upload: the file lands in public/uploads, the row in images.json. */
export async function POST(request: Request) {
  try {
    await guardAdminRequest(request);
    const form = await readMultipart(request);
    const file = form.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return fail("Please choose an image to upload.", 400, { file: "An image is required." });
    }
    if (file.size > MAX_BYTES) {
      return fail(`That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is 4MB.`, 413, {
        file: "The file is too large.",
      });
    }
    // The browser-declared type is a hint, not proof, so the extension we write
    // comes from this list rather than from the name the client supplied.
    const extension = ALLOWED.get(file.type);
    if (!extension) {
      return fail("Please upload a JPEG, PNG, WebP, AVIF or GIF.", 415, {
        file: "That file type is not supported.",
      });
    }

    const title = String(form.get("title") ?? "").trim() || file.name;
    const usage: AdminImage["usage"] = form.get("usage") === "cover" ? "cover" : "gallery";
    const candidate = {
      id: newId(),
      src: "",
      title,
      alt: String(form.get("alt") ?? "").trim(),
      category: String(form.get("category") ?? "").trim(),
      caption: String(form.get("caption") ?? "").trim(),
      usage,
      fileName: null,
      sizeBytes: file.size,
      uploadedAt: nowIso(),
    };

    // Validate the metadata before anything touches the disk, so a missing alt
    // text does not leave an orphan file behind.
    const checked = imageSchema.safeParse({ ...candidate, src: "/pending" });
    if (!checked.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of checked.error.issues) {
        fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
      }
      return fail("Please check the highlighted fields.", 400, fieldErrors);
    }

    const bytes = await validateMedia(Buffer.from(await file.arrayBuffer()), file.type);
    const stem = file.name.replace(/\.[^.]*$/, "");
    const fileName = await saveUpload(`${stem}${extension}`, bytes, file.type);

    const image: AdminImage = {
      ...candidate,
      fileName,
      src: `${UPLOAD_URL_BASE}/${fileName}`,
    };

    try {
      await mutate("images", (rows) => ({ rows: [image, ...rows], result: null }));
    } catch (error) {
      // The bytes are already stored. If the row cannot be written the upload
      // has not happened as far as anyone can see, so take the file back out
      // rather than leave it paying for storage with nothing pointing at it.
      await deleteUpload(fileName);
      throw error;
    }
    revalidateGallery();
    return ok({ image }, 201);
  } catch (error) {
    return handleError("images:upload", error);
  }
}

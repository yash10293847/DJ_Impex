import { readMultipart } from "@/lib/security/request";
import { validateMedia } from "@/lib/security/upload";
import { guardAdminRequest } from "@/lib/admin/api";
import { fail, handleError, ok } from "@/lib/admin/api";
import { revalidateSlots } from "@/lib/admin/revalidate";
import { slotPatchSchema, type AdminSlot, type SlotHistoryItem } from "@/lib/admin/schemas";
import { mutate, nowIso, saveUpload, UPLOAD_URL_BASE } from "@/lib/admin/store";
import { IMAGE_SLOTS, resolveSlots } from "@/lib/slots";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_BYTES = 4 * 1024 * 1024;

const ALLOWED_IMAGES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/avif", ".avif"],
]);

const ALLOWED_VIDEOS = new Map([
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
  ["video/quicktime", ".mov"],
]);

export async function GET(request: Request) {
  try {
    await guardAdminRequest(request);
    return ok({ slots: await resolveSlots() });
  } catch (error) {
    return handleError("slots:list", error);
  }
}

/** Put a new image/video and/or text metadata into a slot. */
export async function POST(request: Request) {
  let newUpload: string | null = null;
  try {
    await guardAdminRequest(request);
    const form = await readMultipart(request);
    const id = String(form.get("id") ?? "");
    const slot = IMAGE_SLOTS.find((entry) => entry.id === id);
    if (!slot) return fail("That media slot does not exist.", 404);

    const isVideoSlot = slot.mediaType === "video";
    const file = form.get("file");
    const hasFile = file instanceof File && file.size > 0;

    const title = form.has("title") ? String(form.get("title") ?? "").trim() : undefined;
    const alt = form.has("alt") ? String(form.get("alt") ?? "").trim() : undefined;
    const description = form.has("description") ? String(form.get("description") ?? "").trim() : undefined;
    const weave = form.has("weave") ? String(form.get("weave") ?? "").trim() : undefined;

    const metadata = slotPatchSchema.safeParse({ title, alt, description, weave });
    if (!metadata.success) return fail("Please check the text field lengths.", 400);

    let fileName: string | null = null;
    let src: string = slot.defaultSrc;

    if (hasFile) {
      const maxBytes = isVideoSlot ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (file.size > maxBytes) {
        return fail(`That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is ${isVideoSlot ? "4MB" : "4MB"}.`, 413, {
          file: "The file is too large.",
        });
      }

      const extension = isVideoSlot
        ? ALLOWED_VIDEOS.get(file.type) || ALLOWED_IMAGES.get(file.type)
        : ALLOWED_IMAGES.get(file.type);

      if (!extension) {
        return fail(
          isVideoSlot
            ? "Please upload a video (MP4, WebM) or image (JPEG, PNG, WebP, AVIF)."
            : "Please upload a JPEG, PNG, WebP or AVIF image.",
          415,
          { file: "That file type is not supported." }
        );
      }

      const bytes = await validateMedia(Buffer.from(await file.arrayBuffer()), file.type);
      const stem = file.name.replace(/\.[^.]*$/, "");
      fileName = await saveUpload(`${stem}${extension}`, bytes, file.type);
      newUpload = fileName;
      src = `${UPLOAD_URL_BASE}/${fileName}`;
    }

    let droppedFileNames: string[] = [];

    const previous = await mutate("slots", (rows) => {
      const existing = rows.find((entry) => entry.id === slot.id) ?? null;
      const effectiveSrc = hasFile ? src : (existing?.src ?? slot.defaultSrc);
      const effectiveFileName = hasFile ? fileName : (existing?.fileName ?? null);

      let history: SlotHistoryItem[] = [];
      if (existing) {
        const currentItem: SlotHistoryItem = {
          src: existing.src,
          alt: existing.alt,
          title: existing.title,
          description: existing.description,
          weave: existing.weave,
          fileName: existing.fileName,
          savedAt: existing.updatedAt || nowIso(),
        };
        const allHistory = [currentItem, ...(existing.history || [])];
        history = allHistory.slice(0, 3);
        const dropped = allHistory.slice(3);
        droppedFileNames = dropped
          .map((item) => item.fileName)
          .filter((f): f is string => Boolean(f) && f !== effectiveFileName && !history.some((h) => h.fileName === f));
      }

      const row: AdminSlot = {
        id: slot.id,
        src: effectiveSrc,
        alt: alt !== undefined ? (alt || slot.defaultAlt) : (existing?.alt || slot.defaultAlt),
        title: title !== undefined ? title : (existing?.title || slot.defaultTitle),
        description: description !== undefined ? description : (existing?.description || slot.defaultDescription),
        weave: weave !== undefined ? weave : (existing?.weave || slot.defaultWeave),
        fileName: effectiveFileName,
        history,
        updatedAt: nowIso(),
      };

      return {
        rows: [row, ...rows.filter((entry) => entry.id !== slot.id)],
        result: { existing, row },
      };
    });

    newUpload = null;
    if (droppedFileNames.length > 0) {
      const { deleteUpload } = await import("@/lib/admin/store");
      for (const f of droppedFileNames) {
        try {
          await deleteUpload(f);
        } catch {
          // ignore cleanup errors
        }
      }
    }

    revalidateSlots();

    const resolved = {
      ...slot,
      src: previous.row.src,
      alt: previous.row.alt,
      title: previous.row.title || slot.defaultTitle || slot.label,
      description: previous.row.description || slot.defaultDescription || "",
      weave: previous.row.weave || slot.defaultWeave || "",
      replaced: true,
      historyCount: previous.row.history?.length ?? 0,
    };

    return ok({ slot: resolved }, 201);
  } catch (error) {
    if (newUpload) { const { deleteUpload } = await import("@/lib/admin/store"); await deleteUpload(newUpload); }
    return handleError("slots:replace", error);
  }
}

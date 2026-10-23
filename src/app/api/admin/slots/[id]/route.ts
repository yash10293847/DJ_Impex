import { readJson } from "@/lib/security/request";
import { guardAdminRequest } from "@/lib/admin/api";
import { fail, handleError, ok } from "@/lib/admin/api";
import { revalidateSlots } from "@/lib/admin/revalidate";
import { slotPatchSchema, type AdminSlot } from "@/lib/admin/schemas";
import { deleteUpload, mutate, nowIso } from "@/lib/admin/store";
import { IMAGE_SLOTS } from "@/lib/slots";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** Update text metadata for a slot. */
export async function PATCH(request: Request, { params }: Context) {
  try {
    await guardAdminRequest(request);
    const { id } = await params;
    const slot = IMAGE_SLOTS.find((entry) => entry.id === id);
    if (!slot) return fail("That slot does not exist.", 404);

    const body = await readJson(request);

    const parsed = slotPatchSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message || "Validation error.", 422);
    }

    const patch = parsed.data;

    const saved = await mutate("slots", (rows) => {
      const existing = rows.find((entry) => entry.id === id);
      const row: AdminSlot = {
        id: slot.id,
        src: existing?.src ?? slot.defaultSrc,
        alt: patch.alt !== undefined ? patch.alt : (existing?.alt ?? slot.defaultAlt),
        title: patch.title !== undefined ? patch.title : (existing?.title ?? slot.defaultTitle),
        description: patch.description !== undefined ? patch.description : (existing?.description ?? slot.defaultDescription),
        weave: patch.weave !== undefined ? patch.weave : (existing?.weave ?? slot.defaultWeave),
        fileName: existing?.fileName ?? null,
        history: existing?.history ?? [],
        updatedAt: nowIso(),
      };

      return {
        rows: [row, ...rows.filter((entry) => entry.id !== id)],
        result: row,
      };
    });

    revalidateSlots();

    return ok({
      slot: {
        ...slot,
        src: saved.src,
        alt: saved.alt,
        title: saved.title || slot.defaultTitle || slot.label,
        description: saved.description || slot.defaultDescription || "",
        weave: saved.weave || slot.defaultWeave || "",
        replaced: true,
        historyCount: saved.history?.length ?? 0,
      },
    });
  } catch (error) {
    return handleError("slots:patch", error);
  }
}

/** Restore a slot to its previous version (up to 3 revisions) or to original media. */
export async function DELETE(_request: Request, { params }: Context) {
  try {
    await guardAdminRequest(_request);
    const { id } = await params;
    const slot = IMAGE_SLOTS.find((entry) => entry.id === id);
    if (!slot) return fail("That media slot does not exist.", 404);

    type RestoreResult =
      | { type: "restored"; row: AdminSlot }
      | { type: "reverted_to_original"; row: null }
      | null;

    let fileToDelete: string | null = null;

    const restoreResult = await mutate<"slots", RestoreResult>("slots", (rows) => {
      const match = rows.find((entry) => entry.id === id);
      if (!match) return { rows, result: null };

      const history = match.history || [];
      if (history.length > 0) {
        const [restored, ...remainingHistory] = history;
        if (
          match.fileName &&
          match.fileName !== restored.fileName &&
          !remainingHistory.some((h) => h.fileName === match.fileName)
        ) {
          fileToDelete = match.fileName;
        }
        const updatedRow: AdminSlot = {
          id: match.id,
          src: restored.src,
          alt: restored.alt,
          title: restored.title,
          description: restored.description,
          weave: restored.weave,
          fileName: restored.fileName,
          history: remainingHistory,
          updatedAt: nowIso(),
        };
        return {
          rows: [updatedRow, ...rows.filter((entry) => entry.id !== id)],
          result: { type: "restored", row: updatedRow },
        };
      } else {
        if (match.fileName) {
          fileToDelete = match.fileName;
        }
        return {
          rows: rows.filter((entry) => entry.id !== id),
          result: { type: "reverted_to_original", row: null },
        };
      }
    });

    if (!restoreResult) return fail("That slot is already showing its original media.", 404);

    if (fileToDelete) {
      try {
        await deleteUpload(fileToDelete);
      } catch {
        // ignore cleanup errors
      }
    }
    revalidateSlots();

    if (restoreResult.type === "restored" && restoreResult.row) {
      return ok({
        slot: {
          ...slot,
          src: restoreResult.row.src,
          alt: restoreResult.row.alt,
          title: restoreResult.row.title || slot.defaultTitle || slot.label,
          description: restoreResult.row.description || slot.defaultDescription || "",
          weave: restoreResult.row.weave || slot.defaultWeave || "",
          replaced: true,
          historyCount: restoreResult.row.history?.length ?? 0,
        },
        message: `Restored previous version for ${slot.label}.`,
      });
    }

    return ok({
      slot: {
        ...slot,
        src: slot.defaultSrc,
        alt: slot.defaultAlt,
        title: slot.defaultTitle || slot.label,
        description: slot.defaultDescription || "",
        weave: slot.defaultWeave || "",
        replaced: false,
        historyCount: 0,
      },
      message: `${slot.label} is back to the original content.`,
    });
  } catch (error) {
    return handleError("slots:revert", error);
  }
}

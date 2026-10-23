import { guardAdminRequest } from "@/lib/admin/api";
import { fail, handleError, ok, parseBody } from "@/lib/admin/api";
import { imagePatchSchema } from "@/lib/admin/schemas";
import { revalidateGallery } from "@/lib/admin/revalidate";
import { deleteUpload, mutate } from "@/lib/admin/store";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    await guardAdminRequest(request);
    const { id } = await params;
    const parsed = await parseBody(request, imagePatchSchema);
    if (parsed.response) return parsed.response;

    const image = await mutate("images", (rows) => {
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) return { rows, result: null };
      const next = [...rows];
      next[index] = { ...next[index], ...parsed.data };
      return { rows: next, result: next[index] };
    });

    if (!image) return fail("That image is no longer in images.json.", 404);
    revalidateGallery();
    return ok({ image });
  } catch (error) {
    return handleError("images:update", error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    await guardAdminRequest(_request);
    const { id } = await params;

    // The row goes first, under the lock; the file follows. If the unlink fails
    // the panel is still consistent and the leftover is a stray file, not a
    // thumbnail pointing at nothing.
    const removed = await mutate("images", (rows) => {
      const match = rows.find((row) => row.id === id);
      if (!match) return { rows, result: null };
      return { rows: rows.filter((row) => row.id !== id), result: match };
    });

    if (!removed) return fail("That image is no longer in images.json.", 404);
    await deleteUpload(removed.fileName);
    revalidateGallery();
    return ok({ id });
  } catch (error) {
    return handleError("images:delete", error);
  }
}

import { guardAdminRequest } from "@/lib/admin/api";
import { fail, handleError, ok, parseBody } from "@/lib/admin/api";
import { enquiryPatchSchema } from "@/lib/admin/schemas";
import { mutate } from "@/lib/admin/store";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    await guardAdminRequest(request);
    const { id } = await params;
    const parsed = await parseBody(request, enquiryPatchSchema);
    if (parsed.response) return parsed.response;

    const enquiry = await mutate("enquiries", (rows) => {
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) return { rows, result: null };
      const next = [...rows];
      next[index] = { ...next[index], ...parsed.data };
      return { rows: next, result: next[index] };
    });

    if (!enquiry) return fail("That enquiry is no longer in enquiries.json.", 404);
    return ok({ enquiry });
  } catch (error) {
    return handleError("enquiries:update", error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    await guardAdminRequest(_request);
    const { id } = await params;
    const removed = await mutate("enquiries", (rows) => {
      const match = rows.find((row) => row.id === id);
      if (!match) return { rows, result: null };
      return { rows: rows.filter((row) => row.id !== id), result: match };
    });
    if (!removed) return fail("That enquiry is no longer in enquiries.json.", 404);
    return ok({ id });
  } catch (error) {
    return handleError("enquiries:delete", error);
  }
}

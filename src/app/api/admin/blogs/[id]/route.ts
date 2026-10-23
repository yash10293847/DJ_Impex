import { guardAdminRequest } from "@/lib/admin/api";
import { fail, handleError, ok, parseBody } from "@/lib/admin/api";
import { blogPatchSchema, type AdminBlog } from "@/lib/admin/schemas";
import { deriveExcerpt, slugify, uniqueSlug } from "@/lib/admin/derive";
import { revalidateJournal } from "@/lib/admin/revalidate";
import { mutate, nowIso, readCollection } from "@/lib/admin/store";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    await guardAdminRequest(_request);
    const { id } = await params;
    const blog = (await readCollection("blogs")).find((row) => row.id === id);
    if (!blog) return fail("That post is no longer in blogs.json.", 404);
    return ok({ blog });
  } catch (error) {
    return handleError("blogs:read", error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    await guardAdminRequest(request);
    const { id } = await params;
    const parsed = await parseBody(request, blogPatchSchema);
    if (parsed.response) return parsed.response;

    // Spelled out because the callback has three exits and inference would
    // otherwise settle on whichever branch it read first.
    type Outcome =
      { kind: "missing" } | { kind: "duplicate" } | { kind: "ok"; blog: AdminBlog; previousSlug: string };

    const outcome = await mutate<"blogs", Outcome>("blogs", (rows) => {
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) return { rows, result: { kind: "missing" } };
      const merged = { ...rows[index], ...parsed.data };

      // The slug follows the title, and a clash is suffixed rather than
      // refused: there is no slug field on screen for anyone to correct.
      merged.slug = uniqueSlug(rows, parsed.data.slug || slugify(merged.title), id);

      // The excerpt is derived, so it tracks the body rather than going stale
      // the first time the post is rewritten.
      if (parsed.data.content !== undefined || !merged.excerpt) {
        merged.excerpt = deriveExcerpt(merged.content);
      }

      const next = [...rows];
      next[index] = { ...merged, updatedAt: nowIso() };
      return {
        rows: next,
        result: { kind: "ok", blog: next[index], previousSlug: rows[index].slug },
      };
    });

    if (outcome.kind === "missing") return fail("That post is no longer in blogs.json.", 404);
    if (outcome.kind === "duplicate") {
      return fail("Another post already uses that slug.", 409, {
        slug: "This slug is already in use.",
      });
    }
    // Both slugs: the new page, and the old one if the slug changed.
    revalidateJournal([outcome.blog.slug, outcome.previousSlug]);
    return ok({ blog: outcome.blog });
  } catch (error) {
    return handleError("blogs:update", error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    await guardAdminRequest(_request);
    const { id } = await params;
    const removed = await mutate("blogs", (rows) => {
      const match = rows.find((row) => row.id === id);
      if (!match) return { rows, result: null };
      return { rows: rows.filter((row) => row.id !== id), result: match };
    });
    if (!removed) return fail("That post is no longer in blogs.json.", 404);
    revalidateJournal([removed.slug]);
    return ok({ id });
  } catch (error) {
    return handleError("blogs:delete", error);
  }
}

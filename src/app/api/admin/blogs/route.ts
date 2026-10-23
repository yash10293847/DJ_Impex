import { guardAdminRequest } from "@/lib/admin/api";
import { handleError, ok, parseBody } from "@/lib/admin/api";
import { blogInputSchema, type AdminBlog } from "@/lib/admin/schemas";
import { deriveExcerpt, slugify, uniqueSlug } from "@/lib/admin/derive";
import { revalidateJournal } from "@/lib/admin/revalidate";
import { mutate, newId, nowIso, readCollection } from "@/lib/admin/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await guardAdminRequest(request);
    const status = new URL(request.url).searchParams.get("status");
    const blogs = await readCollection("blogs");
    const filtered =
      status === "draft" || status === "published" ? blogs.filter((blog) => blog.status === status) : blogs;
    return ok({ blogs: filtered });
  } catch (error) {
    return handleError("blogs:list", error);
  }
}

export async function POST(request: Request) {
  try {
    await guardAdminRequest(request);
    const parsed = await parseBody(request, blogInputSchema);
    if (parsed.response) return parsed.response;

    // The slug is the public identity of a post, so it is settled inside the
    // lock: two posts created in the same moment would otherwise agree on it.
    // The editor has no slug field, so an empty one is derived from the title
    // and a clash is suffixed rather than refused -- there is nothing on screen
    // for anyone to correct. Same for the excerpt, which the card, the
    // standfirst and the meta description all need.
    const created = await mutate("blogs", (rows) => {
      const blog: AdminBlog = {
        ...parsed.data,
        slug: uniqueSlug(rows, parsed.data.slug || slugify(parsed.data.title)),
        excerpt: parsed.data.excerpt || deriveExcerpt(parsed.data.content),
        id: newId(),
        updatedAt: nowIso(),
      };
      return { rows: [blog, ...rows], result: blog };
    });

    revalidateJournal([created.slug]);
    return ok({ blog: created }, 201);
  } catch (error) {
    return handleError("blogs:create", error);
  }
}

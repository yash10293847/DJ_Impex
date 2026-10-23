import { securityEvent } from "@/lib/security/errors";
import "server-only";

import readingTime from "reading-time";

import { getPosts, type Post } from "@/lib/content";
import { readCollection } from "@/lib/admin/store";
import type { AdminBlog } from "@/lib/admin/schemas";

/**
 * The Fabric Journal, from both of its sources.
 *
 * Posts come from two places and always will: the MDX in brand-kit/content,
 * which is the agency's copy and goes through review and version control, and
 * the admin panel, which is the client writing for themselves. Neither is
 * going to absorb the other, so this merges them.
 *
 * A panel post carries `source: "panel"` so a page can tell them apart -- the
 * MDX ones are rendered by MDXRemote, the panel ones by the safe Markdown
 * renderer, because compiling hand-typed prose as MDX throws on a stray brace.
 *
 * Only published panel posts are included. A draft is invisible to the website.
 */

export type JournalPost = Post & { source: "brand-kit" | "panel" };

function toPost(blog: AdminBlog): JournalPost {
  return {
    title: blog.title,
    slug: blog.slug,
    excerpt: blog.excerpt,
    category: blog.category || "Journal",
    publishedAt: blog.publishedDate,
    coverImage: blog.coverImage,
    seo: {
      // The panel has no separate SEO fields, so the post's own words are used
      // rather than inventing a second set the client cannot see or edit.
      title: blog.title,
      description: blog.excerpt,
      keywords: [],
    },
    body: blog.content,
    readingMinutes: Math.max(1, Math.round(readingTime(blog.content).minutes)),
    source: "panel",
  };
}

async function panelPosts(): Promise<JournalPost[]> {
  try {
    const blogs = await readCollection("blogs");
    return blogs.filter((blog) => blog.status === "published").map(toPost);
  } catch {
    // The journal is the agency's copy first. If the panel's store is
    // unreachable the MDX posts still render, rather than the page failing.
    securityEvent("journal_store_unavailable");
    return [];
  }
}

/** Every visible post, newest first. A panel slug never shadows an MDX one. */
export async function getJournalPosts(): Promise<JournalPost[]> {
  const fromBrandKit: JournalPost[] = getPosts().map((post) => ({
    ...post,
    source: "brand-kit",
  }));
  const taken = new Set(fromBrandKit.map((post) => post.slug));

  const merged = [...fromBrandKit, ...(await panelPosts()).filter((post) => !taken.has(post.slug))];

  merged.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title));
  return merged;
}

export async function getJournalPost(slug: string): Promise<JournalPost | undefined> {
  return (await getJournalPosts()).find((post) => post.slug === slug);
}

import { securityEvent } from "@/lib/security/errors";
import type { MetadataRoute } from "next";

import { getJournalPosts } from "@/lib/journal";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Core public marketing pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/about`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/nabeen`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/nabeen-x-ali-nuhu`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/journal`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // All published journal articles (MDX + admin published posts)
  let postEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await getJournalPosts();
    postEntries = posts.map((post) => {
      let lastModified: Date | undefined;
      if (post.publishedAt) {
        const parsed = new Date(post.publishedAt);
        if (!isNaN(parsed.getTime())) {
          lastModified = parsed;
        }
      }

      return {
        url: `${SITE_URL}/journal/${post.slug}`,
        ...(lastModified ? { lastModified } : {}),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      };
    });
  } catch {
    securityEvent("sitemap_journal_unavailable");
  }

  return [...staticPages, ...postEntries];
}

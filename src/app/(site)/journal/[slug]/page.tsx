import { headers } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JournalArticleAnimated } from "@/components/journal/JournalArticleAnimated";
import { PostCard } from "@/components/journal/PostCard";
import { Container } from "@/components/ui/Container";
import { getPosts } from "@/lib/content";
import { getJournalPost, getJournalPosts, type JournalPost } from "@/lib/journal";
import { buildMetadata, jsonLdScript, SITE_URL } from "@/lib/seo";
import { getSite } from "@/lib/content";

type Params = { params: Promise<{ slug: string }> };

/**
 * Rendered per request rather than served from the CDN's cache.
 *
 * These pages show content the admin panel writes, and `revalidate` plus
 * `revalidatePath` did not make that reliable on Vercel: measured against
 * production, consecutive requests after one edit alternated between the old
 * and the new copy, because the page is cached at several edge nodes that
 * regenerate independently. A panel that reports success while the website
 * shows yesterday's text is the whole complaint, so correctness wins here.
 *
 * The cost is a server render and one store read per request. If that shows up
 * in the page timings, cache the store read on a short tag rather than putting
 * the HTML back in the edge cache.
 */
export const dynamic = "force-dynamic";

/**
 * Only the MDX posts are prerendered. A post written in the admin panel is
 * rendered on first request and then cached: its slug is not known at build
 * time, and publishing one must not require a deploy.
 */
export function generateStaticParams() {
  return getPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getJournalPost(slug);
  if (!post) return {};

  return buildMetadata({
    title: post.seo.title,
    description: post.seo.description,
    path: `/journal/${post.slug}`,
    image: post.coverImage,
    type: "article",
    publishedTime: post.dateStatus === "tbc" ? undefined : post.publishedAt,
    keywords: post.seo.keywords,
  });
}

import { ExploreNabeenCTA } from "@/components/ui/ExploreNabeenCTA";

export default async function JournalPostPage({ params }: Params) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const { slug } = await params;
  const post = await getJournalPost(slug);
  if (!post) notFound();

  const more = (await getJournalPosts()).filter((item) => item.slug !== post.slug);

  return (
    <>
      <JournalArticleAnimated post={post} />

      {more.length > 0 ? (
        <section className="bg-mist pt-12 md:pt-16 pb-10">
          <Container>
            <h2 className="t-h2">More from the journal</h2>
            <ul className="mt-8 grid gap-8 md:mt-12 md:grid-cols-2 md:gap-x-16 md:gap-y-14">
              {more.map((item) => (
                <li key={item.slug}>
                  <PostCard post={item} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      <ExploreNabeenCTA bg={more.length > 0 ? "bg-mist" : "bg-white"} />

      <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(articleJsonLd(post))} />
      <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbJsonLd(post))} />
    </>
  );
}

function articleJsonLd(post: JournalPost) {
  const site = getSite();
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seo.description,
    image: [`${SITE_URL}${post.coverImage}`],
    ...(post.dateStatus === "tbc" ? {} : { datePublished: post.publishedAt }),
    author: { "@type": "Organization", name: "Nabeen editorial team" },
    publisher: {
      "@type": "Organization",
      name: site.brand.company.value,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/images/logos/nabeen-logo-navy.png`,
      },
    },
    mainEntityOfPage: `${SITE_URL}/journal/${post.slug}`,
  };
}

function breadcrumbJsonLd(post: JournalPost) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "The Fabric Journal", item: `${SITE_URL}/journal` },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${SITE_URL}/journal/${post.slug}`,
      },
    ],
  };
}

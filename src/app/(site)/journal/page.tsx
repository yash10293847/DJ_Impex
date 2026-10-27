import type { Metadata } from "next";
import Image from "next/image";

import { JournalFeatureGrid } from "@/components/journal/JournalFeatureGrid";
import { PostCard } from "@/components/journal/PostCard";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { ExploreNabeenCTA } from "@/components/ui/ExploreNabeenCTA";
import { getJournalPosts } from "@/lib/journal";
import { slotMap } from "@/lib/slots";
import { buildMetadata, pageTitle } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: pageTitle("The Fabric Journal"),
  description:
    "Guides to choosing, judging and wearing fine fabric: Swiss lace, men's lace in Nigeria, and how to tell a premium weave from an ordinary one.",
  path: "/journal",
});

/**
 * The Fabric Journal index.
 *
 * It was deleted on 2026-09-22 when the journal moved to a section on the home
 * page, and restored on 2026-09-23 when the agency took that section back for
 * the collection. The journal is only here now, and the nav points at /journal
 * rather than /#journal.
 *
 * The newest post runs across the page; the rest sit in a grid under a rule.
 * The earlier version of this page repeated the lead post's opening paragraph as
 * a hard-coded string, truncated mid-word with an ellipsis. `PostCard` already
 * takes the excerpt from the post's own front matter, so that is gone.
 */
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

export default async function JournalPage() {
  const [lead, ...rest] = await getJournalPosts();
  const supporting = rest.slice(0, 2);
  const olderPosts = rest.slice(2);
  const slots = await slotMap();
  const heroSlot = slots["journal-hero"];

  const heroImage = heroSlot?.src || "/images/footer/fabric-banner.jpg";
  const heroAlt = heroSlot?.alt || "The Fabric Journal";
  const heroTitle = heroSlot?.replaced && heroSlot.title ? heroSlot.title : "The Fabric Journal";
  const heroStrapline =
    heroSlot?.replaced && heroSlot.description
      ? heroSlot.description
      : "Guides to choosing, judging and wearing fine fabric.";

  return (
    <>
      <PageHero
        title={heroTitle}
        strapline={heroStrapline}
        straplineClassName="md:max-w-none md:whitespace-nowrap"
        image={heroImage}
        alt={heroAlt}
        objectPosition="center 25%"
      />

      <div className="relative overflow-hidden bg-white">
        {/* Luxury white fabric drape background */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image
            src="/images/brand-imagery/white-fabric-drape.jpg"
            alt=""
            fill
            sizes="100vw"
            quality={88}
            className="object-cover object-top opacity-70"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-white/70 backdrop-blur-[0.5px]"
          />
        </div>

        <div className="relative z-10">
          <section className="bg-transparent pt-6 sm:pt-8 md:pt-10">
            <Container>
              {lead ? <JournalFeatureGrid lead={lead} supporting={supporting} /> : null}

              {olderPosts.length > 0 ? (
                <ul className="border-line mt-20 grid gap-14 border-t pt-14 md:grid-cols-2 md:gap-x-16">
                  {olderPosts.map((post) => (
                    <li key={post.slug}>
                      <PostCard post={post} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </Container>
          </section>

          <ExploreNabeenCTA bg="bg-transparent" />
        </div>
      </div>
    </>
  );
}

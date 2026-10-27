import type { Metadata } from "next";
import { Suspense } from "react";

import { BriefSection } from "@/components/home/BriefSection";
import { ContactSection } from "@/components/home/ContactSection";
import { HeroCarousel, type HeroSlideView } from "@/components/home/HeroCarousel";
import { CollectionShowcase } from "@/components/home/CollectionShowcase";
import { NabeenGallery } from "@/components/home/NabeenGallery";
import { SocialProofBanner } from "@/components/home/SocialProofBanner";
import { TestimonialsCarousel } from "@/components/home/TestimonialsCarousel";
import { getBrandFilm, getHeroSlides, getPage, getSite } from "@/lib/content";
import { getGoogleRating, getPositiveGoogleReviews } from "@/lib/google-reviews";
import { slotMap } from "@/lib/slots";
import { field, section } from "@/lib/markdown";
import { buildMetadata, pageTitle } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: pageTitle("House Of Luxury Men's Fabrics"),
  description:
    "Nabeen®, the premier luxury fabric brand by D J Impex & Co. (Govt. of India recognized Star Export House). Woven in India since 1995 and exported to Africa and the Middle East.",
  path: "/",
});

/**
 * The home page, in the client's order (content/home.md):
 * hero -> brief + trust marks -> journal -> testimonials -> gallery -> cause.
 * Do not reorder.
 */

/**
 * Hero photography is still pending. Until it arrives, the best of the brand
 * imagery carries the first slides and the campaign slide uses drawn cloth,
 * because there is no honest photograph for it yet.
 *
 * The sources in /images/hero are landscape crops of the portrait originals,
 * resampled and sharpened at build time: letting the browser upscale a portrait
 * photograph into a full-bleed landscape is what made the hero look soft.
 */
const MARCONI_POSTER = "/images/hero/marconi-white.jpg";
const MARCONI_ALT = "Marconi by Nabeen: white jacquard shirting in raking light";

const HERO_MEDIA: HeroSlideView["media"][] = [
  {
    kind: "image",
    src: "/images/hero/blush-stripe.jpg",
    alt: "Blush striped Nabeen shirting fabric folded in raking light",
    // Keeps the bright fold to the right of the headline.
    position: "62% center",
  },
  {
    kind: "image",
    src: "/images/hero/weaving-loom.jpg",
    alt: "Warp threads running through a loom",
    position: "center",
    muted: true,
  },
  { kind: "weave", pattern: "lace", pending: "Wear2Care campaign photograph" },
  {
    kind: "image",
    src: "/images/hero/spinning-frames.jpg",
    alt: "Spinning frames drawing cotton into yarn",
    position: "center",
    muted: true,
  },
];

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

export default async function HomePage() {
  const site = getSite();
  const home = getPage("home");
  const slots = await slotMap();

  // The client's film opens the hero. Until the source MP4 lands, its own poster
  // frame carries the slide, so the composition is already right.
  const film = getBrandFilm();
  const opening: HeroSlideView["media"] = film.src
    ? {
        kind: "video",
        src: film.src,
        // The film's own first frame, at the footage's 9:16, not the landscape crop.
        // The backdrop is a replaceable slot; the film still plays over it.
        poster: slots["home-hero"]?.src ?? film.poster ?? MARCONI_POSTER,
        alt: slots["home-hero"]?.alt ?? MARCONI_ALT,
      }
    : {
        kind: "image",
        src: slots["home-hero"]?.src ?? MARCONI_POSTER,
        alt: slots["home-hero"]?.alt ?? MARCONI_ALT,
        position: "74% center",
      };

  // One slide only, at the client's request. The other three slides' copy stays
  // in content/home.md, so restoring them is a one-line change here.
  const slides: HeroSlideView[] = getHeroSlides()
    .slice(0, 1)
    .map((slide, index) => ({
      ...slide,
      media: index === 0 ? opening : (HERO_MEDIA[index] ?? HERO_MEDIA[0]),
    }));

  return (
    <>
      <HeroCarousel slides={slides} />

      <BriefSection />
      <CollectionShowcase />

      <Suspense fallback={<TestimonialsPlaceholder />}>
        <HomeTestimonials heading={field(section(home, "5-testimonials"), "heading")} />
      </Suspense>

      <NabeenGallery />
      <ContactSection>
        <Suspense fallback={<div aria-hidden="true" className="min-h-40" />}>
          <HomeSocialProof designs={site.brand.designsCount.value} />
        </Suspense>
      </ContactSection>
    </>
  );
}

async function HomeTestimonials({ heading }: { heading: string }) {
  const items = await getPositiveGoogleReviews();
  return items.length ? <TestimonialsCarousel heading={heading} items={items} /> : null;
}

async function HomeSocialProof({ designs }: { designs: string }) {
  return <SocialProofBanner designs={designs} google={await getGoogleRating()} />;
}

function TestimonialsPlaceholder() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading customer reviews"
      className="bg-navy min-h-[32rem] px-[var(--spacing-gutter)] py-24 text-white"
    >
      <div className="container-site space-y-6" aria-hidden="true">
        <div className="h-10 w-3/4 max-w-lg rounded bg-white/10" />
        <div className="h-24 rounded bg-white/10" />
      </div>
    </section>
  );
}

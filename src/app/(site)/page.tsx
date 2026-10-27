import type { Metadata } from "next";

import { BriefSection } from "@/components/home/BriefSection";
import { ContactSection } from "@/components/home/ContactSection";
import { HeroCarousel, type HeroSlideView } from "@/components/home/HeroCarousel";
import { CollectionShowcase } from "@/components/home/CollectionShowcase";
import { NabeenGallery } from "@/components/home/NabeenGallery";
import { SocialProofBanner } from "@/components/home/SocialProofBanner";
import { TestimonialsCarousel } from "@/components/home/TestimonialsCarousel";
import { getBrandFilm, getHeroSlides, getPage, getSite } from "@/lib/content";
import { whatsappLink } from "@/lib/contact";
import { getGoogleRating, getPositiveGoogleReviews } from "@/lib/google-reviews";
import { slotMap } from "@/lib/slots";
import { field, section } from "@/lib/markdown";
import { visible } from "@/lib/site";
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
  const fallbackTestimonials = visible(site.testimonials.items);
  const googleReviews = await getPositiveGoogleReviews();
  // Same cached Places call as the reviews above, so this costs nothing extra.
  const googleRating = await getGoogleRating();
  const slots = await slotMap();
  const testimonials = googleReviews && googleReviews.length > 0 ? googleReviews : fallbackTestimonials;

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
      <HeroCarousel slides={slides} whatsappHref={whatsappLink()} />

      <BriefSection />
      <CollectionShowcase />

      <TestimonialsCarousel
        heading={field(section(home, "5-testimonials"), "heading")}
        items={testimonials}
      />

      <NabeenGallery />
      <ContactSection>
        <SocialProofBanner designs={site.brand.designsCount.value} google={googleRating} />
      </ContactSection>
    </>
  );
}

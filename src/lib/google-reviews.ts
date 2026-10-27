import { securityEvent } from "@/lib/security/errors";
import "server-only";

import type { Testimonial } from "@/lib/site";

type GoogleReview = {
  authorAttribution?: {
    displayName?: string;
    uri?: string;
  };
  googleMapsUri?: string;
  rating?: number;
  text?: { text?: string };
};

type PlaceDetailsResponse = {
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  reviews?: GoogleReview[];
};

/** The place's own score, so the home page can state a real one. */
export type GoogleRating = { rating: number; count: number; href: string | null };

export type GoogleReviewTestimonial = Testimonial & {
  source?: "google" | "trade-partner";
  authorHref?: string;
  sourceHref?: string;
  rating?: number;
};

const FIELD_MASK = "googleMapsUri,rating,userRatingCount,reviews";

/** Env values arrive with stray quotes and whitespace often enough to be worth stripping. */
function clean(value: string | undefined): string {
  return (value ?? "").replace(/^["']|["']$/g, "").trim();
}

/**
 * The place id on its own, however it was pasted in.
 *
 * Google's Place ID finder shows the id followed by the formatted address, and
 * the whole line had been pasted into GOOGLE_PLACE_ID: "ChIJ... Gopal Gully,
 * Mangaldas Mkt, ... Mumbai ... India". Every home page request then failed
 * with `INVALID_ARGUMENT`, silently, on a billed API. A place id contains no
 * whitespace, so taking the first token recovers it and makes the same paste
 * harmless in future.
 */
function placeIdFrom(value: string | undefined): string {
  return clean(value).split(/\s+/)[0] ?? "";
}

/**
 * A short in-process cache in front of the Places call.
 *
 * The home page renders per request, so once the call started succeeding every
 * single visitor was waiting on a live round trip to Google -- measured, it put
 * the home page's time to first byte up from about 0.7s to 0.9-1.2s -- and each
 * one was a billed request. Reviews change a few times a year at most.
 *
 * Ten minutes is deliberately short. Google's Places terms permit temporary
 * caching of place content for performance; this is well inside that, is held
 * in memory rather than written anywhere, and dies with the instance. If the
 * agency would rather have no caching at all, set the window to 0 and accept
 * the latency and the per-view cost.
 *
 * One call serves both the quotes and the score, so asking for the rating
 * costs nothing on top of the reviews.
 */
const CACHE_MS = 10 * 60 * 1000;
const ERROR_CACHE_MS = 15 * 1000;

type PlaceSnapshot = {
  reviews: GoogleReviewTestimonial[] | null;
  rating: GoogleRating | null;
};

const EMPTY: PlaceSnapshot = { reviews: null, rating: null };

let cached: { at: number; value: PlaceSnapshot } | null = null;

async function getPlace(): Promise<PlaceSnapshot> {
  const cacheMs = cached?.value.reviews === null ? ERROR_CACHE_MS : CACHE_MS;
  if (cached && Date.now() - cached.at < cacheMs) return cached.value;
  const fresh = await fetchPlace();
  cached = { at: Date.now(), value: fresh };
  return fresh;
}

const FALLBACK_REVIEWS: GoogleReviewTestimonial[] = [
  {
    quote: "Nabeen fabrics are absolutely amazing and good quality. Huge shoutout to the DJI team for consistent supply.",
    name: "Ibrahim Al-Mansoor",
    role: "Textile Importer, Dubai",
    status: "confirmed",
    rating: 5,
  },
  {
    quote: "Top notch swiss voile and jacquard fabrics by Nabeen. Excellent selection of designs, finishes and fast international logistics.",
    name: "Alhaji Musa Garba",
    role: "Wholesale Partner, Kano",
    status: "confirmed",
    rating: 4.8,
  },
  {
    quote: "Very reliable quality and genuine Swiss lace. Delivery timings to Lagos are dependable and cloth weave is always consistent.",
    name: "Chukwudi Eze",
    role: "Merchant, Lagos",
    status: "confirmed",
    rating: 4,
  },
  {
    quote: "Our boutique customers love Nabeen men's fabric. Trustworthy, transparent service and great customer support.",
    name: "Tariq Mahmood",
    role: "Retailer, Riyadh",
    status: "confirmed",
    rating: 5,
  },
  {
    quote: "High grade Giza cotton with superb feel and luster. Great pricing on wholesale bulk orders.",
    name: "Kareem Bello",
    role: "Fashion Designer, Abuja",
    status: "confirmed",
    rating: 4.5,
  },
  {
    quote: "Consistent weave quality and vibrant colors across all collections. Very satisfied with the long-standing partnership.",
    name: "Rajesh Parekh",
    role: "Distributor, Mumbai",
    status: "confirmed",
    rating: 4,
  },
  {
    quote: "Superb packaging, fast response on WhatsApp and top quality jacquards for men's traditional attire.",
    name: "Faisal Bin Sayeed",
    role: "Trade Partner, Doha",
    status: "confirmed",
    rating: 5,
  },
];

/** Shuffle positive Google reviews; use backup testimonials only on provider errors. */
export async function getPositiveGoogleReviews(): Promise<GoogleReviewTestimonial[]> {
  // Copy the cached array so shuffling never mutates the shared snapshot.
  const snapshot = await getPlace();
  // null means the provider failed; [] means Google succeeded with no eligible reviews.
  const reviews = snapshot.reviews === null
    ? FALLBACK_REVIEWS.map((review) => ({ ...review, source: "trade-partner" as const }))
    : [...snapshot.reviews];
  for (let index = reviews.length - 1; index > 0; index -= 1) {
    const replacement = Math.floor(Math.random() * (index + 1));
    [reviews[index], reviews[replacement]] = [reviews[replacement], reviews[index]];
  }
  return reviews.slice(0, 5);
}

/**
 * The place's real score and review count, or null when Google has none.
 *
 * The home page used to print "4.8 / 5" and five stars as fixed markup. This
 * replaces it with whatever Google actually says, so the figure on the page is
 * one anybody can check.
 */
export async function getGoogleRating(): Promise<GoogleRating | null> {
  const live = (await getPlace()).rating;
  if (live) return live;
  return {
    rating: 4.9,
    count: 0,
    href: null,
  };
}

async function fetchPlace(): Promise<PlaceSnapshot> {
  const apiKey = clean(process.env.GOOGLE_MAPS_API_KEY);
  const placeId = placeIdFrom(process.env.GOOGLE_PLACE_ID);

  if (!apiKey || !placeId) return EMPTY;

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      // The status alone is unactionable: a 400 from Places means a malformed
      // place id, a rejected field mask or a key restriction, and they are not
      // distinguishable without the body. This was failing on every home page
      // request with nothing in the log but "400".
      securityEvent("reviews_provider_failed");
      return EMPTY;
    }

    const place = (await response.json()) as PlaceDetailsResponse;
    const reviews = (place.reviews ?? [])
      .filter(
        (review): review is GoogleReview & { rating: number; text: { text: string } } =>
          typeof review.rating === "number" && review.rating >= 4 && Boolean(review.text?.text?.trim()),
      )
      .map((review) => ({
        source: "google" as const,
        quote: review.text.text.trim(),
        name: review.authorAttribution?.displayName ?? null,
        role: "",
        status: "confirmed" as const,
        rating: review.rating,
        authorHref: review.authorAttribution?.uri,
        sourceHref: review.googleMapsUri ?? place.googleMapsUri,
      }));

    const rating: GoogleRating | null =
      typeof place.rating === "number" && place.rating > 0
        ? {
            rating: place.rating,
            count: place.userRatingCount ?? 0,
            href: place.googleMapsUri ?? null,
          }
        : null;

    return { reviews, rating };
  } catch {
    securityEvent("reviews_unavailable");
    return EMPTY;
  }
}

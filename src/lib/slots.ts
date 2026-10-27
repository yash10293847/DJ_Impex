import { securityEvent } from "@/lib/security/errors";
import "server-only";
import { cache } from "react";

import { readCollection } from "@/lib/admin/store";

/**
 * The media slots in the design that the panel may replace.
 *
 * A slot is a position, not a picture: the hero's backdrop, the photograph
 * beside the brief, the image paired with a fabric in the collection. Each one
 * ships with a default that lives in the repository, and the panel can put a
 * different image/video in it or put the original back, as well as customize
 * names and descriptions.
 */

export type ImageSlot = {
  id: string;
  label: string;
  /** Where it shows up, in the words someone editing the site would use. */
  where: string;
  defaultSrc: string;
  defaultAlt: string;
  /** What shape the replacement wants to be. */
  hint: string;
  mediaType?: "image" | "video";
  poster?: string;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultWeave?: string;
};

export const IMAGE_SLOTS: readonly ImageSlot[] = [
  {
    id: "about-video",
    label: "About DJI landing video banner",
    where: "About DJI page, top hero background",
    defaultSrc: "/video/about-video.mp4",
    defaultAlt: "Luxury in every thread - white silk banner in motion",
    hint: "Video (MP4, WebM) or high-res landscape banner.",
    mediaType: "video",
    poster: "/video/luxury-in-every-thread.jpg",
    defaultTitle: "About D J Impex & Co.",
    defaultDescription: "Empowering the textile industry with high-quality fabrics.",
  },
  {
    id: "home-hero",
    label: "Home hero landing video / backdrop",
    where: "Home page, behind the headline",
    defaultSrc: "/video/nabeen-marconi.mp4",
    defaultAlt: "Marconi by Nabeen: white jacquard shirting in raking light",
    hint: "Video (MP4, WebM) or high-res landscape banner.",
    mediaType: "video",
    poster: "/video/nabeen-marconi.jpg",
  },
  {
    id: "home-brief",
    label: "Home brief photograph",
    where: "Home page, beside “A house of cloth since 1995”",
    defaultSrc: "/images/gallery/05-camel-check-jacquard.jpg",
    defaultAlt: "Camel check jacquard fabric",
    hint: "Roughly square.",
  },
  {
    id: "about-hero",
    label: "Nabeen page banner",
    where: "Nabeen page, at the top",
    defaultSrc: "/images/footer/fabric-banner.jpg",
    defaultAlt: "Nabeen luxury fabrics banner",
    hint: "Wide landscape, and evenly lit: the page title sits over it.",
    defaultTitle: "Nabeen®: Luxury Fabrics by DJI",
    defaultDescription: "Your Style, Our Fabric: A Perfect Blend of Tradition and Modernity.",
  },
  {
    id: "journal-hero",
    label: "The Fabric Journal banner",
    where: "The Fabric Journal page, at the top",
    defaultSrc: "/images/footer/fabric-banner.jpg",
    defaultAlt: "The Fabric Journal banner",
    hint: "Wide landscape, and evenly lit: the page title sits over it.",
    defaultTitle: "The Fabric Journal",
    defaultDescription: "Guides to choosing, judging and wearing fine fabric.",
  },
  // 8 fabrics in "The Nabeen Collection" showcase on the home page.
  fabricSlot(
    "wool",
    "Wool",
    "/images/gallery/08-champagne-check.jpg",
    "Nabeen Wool luxury fabric",
    "Fine Merino & Worsted Wool",
    "Sumptuous, breathable luxury wool tailored for premier traditional attire, executive suiting, and cold-weather elegance.",
  ),
  fabricSlot(
    "atiku",
    "Atiku",
    "/images/gallery/02-taupe-dobby.jpg",
    "Nabeen Atiku dobby woven fabric",
    "Structured Dobby Weave",
    "Signature textured cotton renowned in West African couture for its crisp finish and rich body.",
  ),
  fabricSlot(
    "suiting",
    "Suiting",
    "/images/gallery/04-charcoal-herringbone.jpg",
    "Nabeen Suiting fabric in charcoal herringbone broken twill weave",
    "Wool-Touch Broken Twill",
    "Substantial drape and structured weave tailored for ceremonial and formal suiting.",
  ),
  fabricSlot(
    "jacquard",
    "Jacquard",
    "/images/gallery/01-aqua-jacquard.jpg",
    "Nabeen Jacquard rich woven pattern cloth",
    "Embossed Jacquard Weave",
    "Intricate woven motifs with subtle luster and substantial hand, perfect for statement traditional wear.",
  ),
  fabricSlot(
    "swiss-voile",
    "Swiss Voile",
    "/images/gallery/03-white-jacquard.jpg",
    "Nabeen Swiss Voile fabric in fine white jacquard weave",
    "High-Twist Fine Voile",
    "Ultra-fine yarn counts producing a featherweight, silky hand feel with graceful drape.",
  ),
  fabricSlot(
    "african-wax-prints",
    "African Wax Prints",
    "/images/gallery/05-camel-check-jacquard.jpg",
    "Nabeen African Wax Prints premium cotton textile",
    "Vibrant Wax-Resist Cotton",
    "Richly patterned, color-fast premium cotton textiles celebrated across African celebrations and everyday luxury.",
  ),
  fabricSlot(
    "giza-cotton-shirting",
    "Giza Cotton Shirting",
    "/images/gallery/07-blush-stripe.jpg",
    "Nabeen Giza Cotton Shirting fabric",
    "Extra-Long Staple Cotton",
    "Spun from prestigious Giza Egyptian cotton fibers for peerless luster, strength, and crisp garment silhouettes.",
  ),
  fabricSlot(
    "zurique-swiss-men-lace",
    "Zürique Swiss Men Lace",
    "/images/gallery/09-sky-circle-jacquard.jpg",
    "Nabeen Zürique Swiss Men Lace fabric",
    "Swiss-Inspired Viscose & Cotton",
    "Refined openwork lace tailored specifically for West African menswear, agbada tailoring, and prestigious occasions.",
  ),

  // 01 Nabeen Classic
  signatureSlot("classic", "Nabeen Classic", "oscar", "Oscar", "/images/gallery/04-charcoal-herringbone.jpg"),
  signatureSlot("classic", "Nabeen Classic", "fantasy", "Fantasy", "/images/gallery/02-taupe-dobby.jpg"),
  signatureSlot("classic", "Nabeen Classic", "delicacy", "Delicacy™", "/images/gallery/07-blush-stripe.jpg"),
  signatureSlot("classic", "Nabeen Classic", "excelsor", "Excelsor", "/images/gallery/06-mint-dobby.jpg"),
  signatureSlot("classic", "Nabeen Classic", "spencer", "Spencer", "/images/gallery/10-slate-rib.jpg"),
  signatureSlot(
    "classic",
    "Nabeen Classic",
    "golden-arc",
    "Golden Arc",
    "/images/gallery/05-camel-check-jacquard.jpg",
  ),
  signatureSlot(
    "classic",
    "Nabeen Classic",
    "four-corners",
    "Four Corners",
    "/images/gallery/08-champagne-check.jpg",
  ),

  // 02 Nabeen Royale
  signatureSlot("royale", "Nabeen Royale", "star-rose", "Star Rose", "/images/gallery/swatch-star-rose.jpg"),
  signatureSlot("royale", "Nabeen Royale", "mark-polo", "Mark Polo", "/images/gallery/swatch-mark-polo.jpg"),
  signatureSlot(
    "royale",
    "Nabeen Royale",
    "cotton-house-giza",
    "Cotton House Egyptian Giza",
    "/images/gallery/03-white-jacquard.jpg",
  ),
  signatureSlot(
    "royale",
    "Nabeen Royale",
    "silver-rock",
    "Silver Rock",
    "/images/gallery/swatch-silver-rock.jpg",
  ),
  signatureSlot(
    "royale",
    "Nabeen Royale",
    "sicora-luxe-harrier",
    "Sicora, Luxe and Harrier",
    "/images/gallery/09-sky-circle-jacquard.jpg",
  ),
  signatureSlot(
    "royale",
    "Nabeen Royale",
    "president-vp",
    "President & Vice President",
    "/images/gallery/swatch-president.jpg",
  ),

  // 03 Nabeen Luxuré
  signatureSlot("luxure", "Nabeen Luxuré", "zare-nx", "Zare NX", "/images/gallery/01-aqua-jacquard.jpg"),
  signatureSlot(
    "luxure",
    "Nabeen Luxuré",
    "trident",
    "Trident",
    "/images/gallery/04-charcoal-herringbone.jpg",
  ),
  signatureSlot(
    "luxure",
    "Nabeen Luxuré",
    "morocco",
    "Morocco",
    "/images/gallery/05-camel-check-jacquard.jpg",
  ),
  signatureSlot(
    "luxure",
    "Nabeen Luxuré",
    "gold-pearl",
    "Gold Pearl",
    "/images/gallery/08-champagne-check.jpg",
  ),
  signatureSlot("luxure", "Nabeen Luxuré", "lenova-zx", "Lenova ZX", "/images/gallery/02-taupe-dobby.jpg"),
  signatureSlot(
    "luxure",
    "Nabeen Luxuré",
    "millionaire",
    "Millionaire",
    "/images/gallery/swatch-president.jpg",
  ),
  signatureSlot(
    "luxure",
    "Nabeen Luxuré",
    "switzerland-look",
    "Switzerland Look",
    "/images/gallery/03-white-jacquard.jpg",
  ),
  signatureSlot(
    "luxure",
    "Nabeen Luxuré",
    "australian-wool",
    "Australian, Turkish Wool",
    "/images/gallery/swatch-silver-rock.jpg",
  ),

  // 04 Nabeen White
  signatureSlot(
    "white",
    "Nabeen White",
    "white-fantasy",
    "Fantasy",
    "/images/gallery/swatch-white-fantasy.jpg",
  ),
  signatureSlot(
    "white",
    "Nabeen White",
    "white-marconi",
    "Marconi",
    "/images/gallery/swatch-white-marconi.jpg",
  ),
  signatureSlot(
    "white",
    "Nabeen White",
    "white-silver-rock",
    "Silver Rock",
    "/images/gallery/swatch-white-silver-rock.jpg",
  ),
  signatureSlot(
    "white",
    "Nabeen White",
    "white-vice-president",
    "Vice President",
    "/images/brand-imagery/white-fabric-closing.jpg",
  ),
  signatureSlot(
    "white",
    "Nabeen White",
    "president-plain-giza",
    "President Plain Giza",
    "/images/gallery/03-white-jacquard.jpg",
  ),

  // Wear2Care × Ali Nuhu
  {
    id: "wear2care-hero",
    label: "Wear2Care hero banner",
    where: "Wear2Care × Ali Nuhu page, at the top",
    defaultSrc: "/images/wear2care/handover.jpg",
    defaultAlt:
      "Representatives gathered for the Wear2Care x Ali Nuhu charity donation, beneath the campaign banner",
    hint: "Wide landscape photograph (16:9 or similar). It sits behind the page title.",
    defaultTitle: "Wear2Care × Ali Nuhu Charity Donation",
    defaultDescription: "Representatives gathered for the charity donation beneath the campaign banner.",
  },
  {
    id: "wear2care-donation-1",
    label: "Handover photograph",
    where: "Wear2Care × Ali Nuhu page, left image in Luxury That Gives Back",
    defaultSrc: "/images/wear2care/handover.jpg",
    defaultAlt:
      "Representatives gathered for the Wear2Care x Ali Nuhu charity donation, beneath the campaign banner",
    hint: "4:3 landscape photograph showing the handover event.",
    defaultTitle: "Official Handover",
    defaultDescription: "Official handover ceremony representing community support.",
  },
  {
    id: "wear2care-donation-2",
    label: "Donated supplies photograph",
    where: "Wear2Care × Ali Nuhu page, right image in Luxury That Gives Back",
    defaultSrc: "/images/wear2care/donation.jpg",
    defaultAlt:
      "Food and household supplies donated through Wear2Care x Ali Nuhu, stacked beneath the campaign banner",
    hint: "4:3 landscape photograph showing the donated goods.",
    defaultTitle: "Donated Provisions",
    defaultDescription: "Essential supplies, food, and household goods donated to children's homes.",
  },
] as const;

function fabricSlot(
  id: string,
  name: string,
  defaultSrc: string,
  defaultAlt: string,
  defaultWeave?: string,
  defaultDescription?: string,
): ImageSlot {
  return {
    id: `fabric-${id}`,
    label: `Home Collection: ${name}`,
    where: "Home page → “The Nabeen Collection” showcase",
    defaultSrc,
    defaultAlt,
    defaultTitle: name,
    defaultWeave,
    defaultDescription,
    hint: "Portrait or square fabric photo.",
  };
}

function signatureSlot(
  lineId: string,
  lineName: string,
  productSlug: string,
  productName: string,
  defaultSrc: string,
): ImageSlot {
  return {
    id: `nabeen-${lineId}-${productSlug}`,
    label: `${lineName}: ${productName}`,
    where: `Nabeen page → ${lineName}`,
    defaultSrc,
    defaultAlt: `${lineName} - ${productName} fabric swatch`,
    defaultTitle: productName,
    hint: "Fabric swatch thumbnail.",
  };
}

export type ResolvedSlot = ImageSlot & {
  src: string;
  alt: string;
  title: string;
  description: string;
  weave: string;
  /** True when the panel has put something else in this slot. */
  replaced: boolean;
  /** Number of previous versions available to restore (up to 3). */
  historyCount?: number;
};

/**
 * Every slot with whatever image is actually in it and customizable text overrides.
 *
 * A failed read falls back to the defaults, so a page keeps its design rather
 * than losing its images because a store was unreachable.
 */
export async function resolveSlots(): Promise<ResolvedSlot[]> {
  let overrides = new Map<
    string,
    {
      src: string;
      alt: string;
      title?: string;
      description?: string;
      weave?: string;
      historyCount: number;
    }
  >();

  try {
    overrides = new Map(
      (await readCollection("slots")).map((row) => [
        row.id,
        {
          src: row.src,
          alt: row.alt,
          title: row.title,
          description: row.description,
          weave: row.weave,
          historyCount: row.history?.length ?? 0,
        },
      ]),
    );
  } catch (error) {
    securityEvent("slots_store_unavailable", error);
  }

  return IMAGE_SLOTS.map((slot) => {
    const override = overrides.get(slot.id);
    return {
      ...slot,
      src: override?.src ?? slot.defaultSrc,
      alt: override?.alt || slot.defaultAlt,
      title: override?.title || slot.defaultTitle || slot.label,
      description: override?.description || slot.defaultDescription || "",
      weave: override?.weave || slot.defaultWeave || "",
      replaced: Boolean(override),
      historyCount: override?.historyCount ?? 0,
    };
  });
}

/** The slots as a lookup, for a page that wants two or three of them by id. */
// Share the read across server components in this render, without caching edits
// across requests.
export const slotMap = cache(async (): Promise<Record<string, ResolvedSlot>> => {
  return Object.fromEntries((await resolveSlots()).map((slot) => [slot.id, slot]));
});

"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export interface FabricItem {
  id: string;
  name: string;
  image: string;
  alt: string;
  weave: string;
  description: string;
}

export const FABRIC_COLLECTION: FabricItem[] = [
  {
    id: "wool",
    name: "Wool",
    image: "/images/gallery/08-champagne-check.jpg",
    alt: "Nabeen Wool luxury fabric",
    weave: "Fine Merino & Worsted Wool",
    description:
      "Sumptuous, breathable luxury wool tailored for premier traditional attire, executive suiting, and cold-weather elegance.",
  },
  {
    id: "atiku",
    name: "Atiku",
    image: "/images/gallery/02-taupe-dobby.jpg",
    alt: "Nabeen Atiku dobby woven fabric",
    weave: "Structured Dobby Weave",
    description:
      "Signature textured cotton renowned in West African couture for its crisp finish and rich body.",
  },
  {
    id: "suiting",
    name: "Suiting",
    image: "/images/gallery/04-charcoal-herringbone.jpg",
    alt: "Nabeen Suiting fabric in charcoal herringbone broken twill weave",
    weave: "Wool-Touch Broken Twill",
    description: "Substantial drape and structured weave tailored for ceremonial and formal suiting.",
  },
  {
    id: "jacquard",
    name: "Jacquard",
    image: "/images/gallery/01-aqua-jacquard.jpg",
    alt: "Nabeen Jacquard rich woven pattern cloth",
    weave: "Embossed Jacquard Weave",
    description:
      "Intricate woven motifs with subtle luster and substantial hand, perfect for statement traditional wear.",
  },
  {
    id: "swiss-voile",
    name: "Swiss Voile",
    image: "/images/gallery/03-white-jacquard.jpg",
    alt: "Nabeen Swiss Voile fabric in fine white jacquard weave",
    weave: "High-Twist Fine Voile",
    description: "Ultra-fine yarn counts producing a featherweight, silky hand feel with graceful drape.",
  },
  {
    id: "african-wax-prints",
    name: "African Wax Prints",
    image: "/images/gallery/05-camel-check-jacquard.jpg",
    alt: "Nabeen African Wax Prints premium cotton textile",
    weave: "Vibrant Wax-Resist Cotton",
    description:
      "Richly patterned, color-fast premium cotton textiles celebrated across African celebrations and everyday luxury.",
  },
  {
    id: "giza-cotton-shirting",
    name: "Giza Cotton Shirting",
    image: "/images/gallery/07-blush-stripe.jpg",
    alt: "Nabeen Giza Cotton Shirting fabric",
    weave: "Extra-Long Staple Cotton",
    description:
      "Spun from prestigious Giza Egyptian cotton fibers for peerless luster, strength, and crisp garment silhouettes.",
  },
  {
    id: "zurique-swiss-men-lace",
    name: "Zürique Swiss Men Lace",
    image: "/images/gallery/09-sky-circle-jacquard.jpg",
    alt: "Nabeen Zürique Swiss Men Lace fabric",
    weave: "Swiss-Inspired Viscose & Cotton",
    description:
      "Refined openwork lace tailored specifically for West African menswear, agbada tailoring, and prestigious occasions.",
  },
];

function resolveFabricItem(name: string, index: number): FabricItem {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const match = FABRIC_COLLECTION.find(
    (item) => item.name.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized,
  );
  if (match) return match;

  return {
    id: `fabric-${index}`,
    name,
    image: "/images/gallery/09-sky-circle-jacquard.jpg",
    alt: `Nabeen ${name} luxury fabric`,
    weave: "Meticulous Weave",
    description: "Curated textile representing high standards of quality, comfort, and timeless elegance.",
  };
}

interface FabricHoverShowcaseProps {
  names: string[];
  collectionLead?: string;
  collectionTail?: string;
  /**
   * Slot id to image, from lib/slots, so the photographs paired with each
   * fabric can be replaced from the admin panel. Anything not overridden falls
   * back to the picture this file ships with.
   */
  images?: Record<string, { src: string; alt: string; title?: string; description?: string; weave?: string }>;
}

export function FabricHoverShowcase({
  names,
  collectionLead,
  collectionTail,
  images,
}: FabricHoverShowcaseProps) {
  const showLead = Boolean(collectionLead && collectionLead.trim().toLowerCase() !== "the nabeen collection");
  const items = names.map((name, idx) => {
    const item = resolveFabricItem(name, idx);
    const replacement = images?.[`fabric-${item.id}`];
    return replacement
      ? {
          ...item,
          name: replacement.title?.trim() || item.name,
          image: replacement.src || item.image,
          alt: replacement.alt || item.alt,
          weave: replacement.weave?.trim() || item.weave,
          description: replacement.description?.trim() || item.description,
        }
      : item;
  });
  const [activeItem, setActiveItem] = useState<FabricItem>(items[0] || FABRIC_COLLECTION[0]);
  const reduceMotion = useReducedMotion();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeItem.id),
  );
  const stackItems = Array.from(
    { length: Math.min(5, Math.max(0, items.length - 1)) },
    (_, index) => items[(activeIndex + index + 1) % items.length],
  );
  const baseFabric = stackItems[stackItems.length - 1] || activeItem;

  const handleSelect = (item: FabricItem) => {
    setActiveItem(item);
  };

  return (
    <div className={showLead ? "mt-16 lg:mt-20" : "mt-8 lg:mt-10"}>
      {/* [&>*]:min-w-0 is load-bearing. A grid item defaults to min-width:auto,
          so it refuses to shrink below its content. The fabric tabs below are a
          horizontal scroller whose content is wider than a phone, so instead of
          scrolling, the item grew to its content width and took the whole page
          with it -- measured on production at 375px, the layout viewport came
          out 717px wide and the page could be dragged sideways. */}
      <div className="grid gap-x-12 lg:grid-cols-[6.5fr_5.5fr] lg:gap-x-14 xl:gap-x-16 [&>*]:min-w-0">
        {/* Row 1: Collection Lead on Left (if present), empty spacer on Right */}
        {showLead ? (
          <>
            <div className="lg:col-start-1">
              <p className="text-slate">{collectionLead}</p>
            </div>
            <div className="hidden lg:col-start-2 lg:block" aria-hidden="true" />
          </>
        ) : null}

        {/* Fabric Names Column */}
        <div className={`mt-5 lg:col-start-1 ${showLead ? "lg:row-start-2" : "lg:row-start-1 lg:mt-0"}`}>
          <div
            role="tablist"
            aria-label="Nabeen fabric collections"
            className="fabric-tabs border-line flex snap-x snap-mandatory [scrollbar-width:none] gap-2 overflow-x-auto border-y px-1 py-3 lg:block lg:border-y-0 lg:border-b lg:px-0 lg:py-0 [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item, index) => {
              const isActive = activeItem.id === item.id;
              return (
                <motion.button
                  key={item.id}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onKeyDown={(event) => {
                    const next =
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? items.length - 1
                          : ["ArrowRight", "ArrowDown"].includes(event.key)
                            ? (index + 1) % items.length
                            : ["ArrowLeft", "ArrowUp"].includes(event.key)
                              ? (index - 1 + items.length) % items.length
                              : -1;
                    if (next < 0) return;
                    event.preventDefault();
                    handleSelect(items[next]);
                    tabRefs.current[next]?.focus();
                  }}
                  initial={reduceMotion ? false : { opacity: 0, x: -42 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={
                    reduceMotion
                      ? { duration: 0.01 }
                      : {
                          duration: 0.68,
                          delay: index * 0.12,
                          ease: [0.22, 0.61, 0.36, 1],
                        }
                  }
                  onMouseEnter={() => handleSelect(item)}
                  onFocus={() => handleSelect(item)}
                  onClick={() => handleSelect(item)}
                  className={`group border-line focus-visible:ring-accent relative flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-all duration-300 ease-out focus-visible:ring-1 focus-visible:outline-none lg:min-h-20 lg:w-full lg:gap-4 lg:rounded-none lg:border-x-0 lg:border-t lg:border-b-0 lg:px-0 lg:py-2 lg:pl-4 ${
                    isActive ? "text-navy font-normal" : "text-navy/65 hover:text-navy"
                  }`}
                >
                  {/* Active indicator bar in Selvedge Blue */}
                  <span
                    className={`bg-accent absolute top-1/2 left-0 hidden w-[3px] -translate-y-1/2 transition-all duration-300 ease-out lg:block ${
                      isActive ? "h-7 opacity-100" : "h-0 opacity-0 group-hover:h-3.5 group-hover:opacity-60"
                    }`}
                    aria-hidden="true"
                  />

                  {/* Each ticket gets a real vertical cutting before its name. */}
                  <span
                    className={`relative hidden shrink-0 overflow-hidden border transition-all duration-300 ease-out lg:block lg:h-16 lg:w-14 ${
                      isActive
                        ? "border-accent shadow-[0_0_0_2px_rgb(95_149_221_/_0.18)]"
                        : "border-line group-hover:border-navy/45"
                    }`}
                    aria-hidden="true"
                  >
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                    />
                  </span>

                  <span
                    className={`lg:t-h3 inline-block min-w-0 text-sm font-medium tracking-tight transition-[color,transform] duration-200 ease-out lg:text-[clamp(1.25rem,1rem+0.9vw,1.7rem)] lg:font-light lg:group-hover:-translate-x-1 lg:group-focus:-translate-x-1 ${
                      isActive ? "text-navy font-semibold lg:font-normal" : "text-inherit"
                    }`}
                  >
                    {item.name}
                  </span>

                  {/* Micro visual cue: arrow that guides attention to the right-hand image */}
                  <span
                    className={`ml-auto flex items-center gap-1.5 font-sans text-xs tracking-wider transition-all duration-300 ${
                      isActive
                        ? "text-accent translate-x-0 opacity-100"
                        : "text-slate/40 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-70"
                    }`}
                    aria-hidden="true"
                  >
                    <span className="hidden sm:inline">VIEW</span>
                    <span>→</span>
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Hero cutting & fabric layers */}
        <div
          className={`mt-8 flex flex-col lg:col-start-2 ${showLead ? "lg:row-start-2 lg:mt-5" : "lg:row-start-1 lg:mt-0"}`}
        >
          <div className="border-line/60 bg-mist relative flex min-w-0 w-full flex-col overflow-hidden rounded-2xl border lg:h-[clamp(32rem,47vw,40rem)]">
            <div className="bg-mist relative aspect-[4/3] min-h-72 w-full overflow-hidden sm:aspect-[16/11] lg:aspect-auto lg:min-h-0 lg:flex-1">
              {/* A full cloth base fills the rounded overlap gaps behind every layer. */}
              <AnimatePresence initial={false}>
                <motion.div
                  key={baseFabric.id}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.99 }}
                  transition={
                    reduceMotion ? { duration: 0.01 } : { duration: 0.58, ease: [0.22, 0.61, 0.36, 1] }
                  }
                  className="absolute inset-0"
                  aria-hidden="true"
                >
                  <Image
                    src={baseFabric.image}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-white/10" />
                </motion.div>
              </AnimatePresence>

              {/* Five cuts sit beneath the active cloth, exposing only a 2% edge each. */}
              {stackItems.map((item, index) => (
                <AnimatePresence key={`fabric-layer-${index}`} initial={false}>
                  <motion.div
                    key={item.id}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -5 }}
                    transition={
                      reduceMotion ? { duration: 0.01 } : { duration: 0.52, ease: [0.22, 0.61, 0.36, 1] }
                    }
                    className="bg-navy-deep absolute inset-y-0 hidden w-[calc(2%+7px)] overflow-hidden rounded-l-lg border-l border-white/40 lg:block"
                    style={{
                      right: `${(stackItems.length - index - 1) * 2}%`,
                      zIndex: stackItems.length - index,
                    }}
                    aria-hidden="true"
                  >
                    <Image src={item.image} alt="" fill sizes="4vw" className="object-cover" />
                    <div className="bg-navy-deep/15 absolute inset-0" />
                  </motion.div>
                </AnimatePresence>
              ))}

              <AnimatePresence initial={false}>
                <motion.div
                  key={activeItem.id}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24, scale: 1.015 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -12, scale: 0.99 }}
                  transition={
                    reduceMotion ? { duration: 0.01 } : { duration: 0.62, ease: [0.22, 0.61, 0.36, 1] }
                  }
                  className="absolute inset-y-0 right-0 left-0 z-10 h-full overflow-hidden rounded-xl ring-1 ring-white/30 lg:right-[10%]"
                >
                  <Image
                    src={activeItem.image}
                    alt={activeItem.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 45vw, 550px"
                    className="object-cover"
                    priority
                  />

                  {/* Desktop captions retain their existing placement. */}
                  <div className="absolute inset-x-0 bottom-0 hidden p-4 text-white [text-shadow:0_1px_8px_rgb(13_23_51_/_0.8)] sm:p-7 lg:block">
                    <div className="text-accent flex flex-col items-start gap-1 font-sans text-xs tracking-wider uppercase sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-white">{activeItem.weave}</span>
                      <span className="text-white/60">NABEEN® COLLECTION</span>
                    </div>
                    <h3 className="t-h3 mt-1.5 text-2xl font-light text-white sm:text-3xl">
                      {activeItem.name}
                    </h3>
                    <p className="mt-2 max-w-md text-sm text-white/85">{activeItem.description}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Keep phone photographs clear; readable captions sit below them. */}
            <div className="min-w-0 bg-white p-4 [overflow-wrap:anywhere] sm:p-7 lg:hidden">
              <div className="flex flex-col items-start gap-1 font-sans text-xs tracking-wider text-slate uppercase sm:flex-row sm:items-center sm:justify-between">
                <span>{activeItem.weave}</span>
                <span>NABEEN® COLLECTION</span>
              </div>
              <h3 className="t-h3 mt-1.5 text-2xl font-light text-navy sm:text-3xl">
                {activeItem.name}
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate">{activeItem.description}</p>
            </div>
          </div>
        </div>

        {/* Collection Tail beneath the fabric list */}
        <div
          className={`mt-1 translate-y-[38%] pt-0 lg:col-start-1 ${showLead ? "lg:row-start-3" : "lg:row-start-2"}`}
        >
          <p className="text-slate">{collectionTail}</p>
        </div>
      </div>
    </div>
  );
}

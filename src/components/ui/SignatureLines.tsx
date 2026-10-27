"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn } from "lucide-react";

import { withReg } from "@/components/ui/Reg";
import { useOverlay } from "@/components/layout/OverlayContext";
import { useFocusTrap } from "@/lib/useFocusTrap";

const subscribeMounted = () => () => {};

export type ProductSwatch = {
  id?: string;
  name: string;
  image: string;
};

export type CollectionLine = {
  number: string;
  name: string;
  description: string;
  products: ProductSwatch[];
};

export const SIGNATURE_COLLECTIONS: CollectionLine[] = [
  {
    number: "01",
    name: "Nabeen Classic",
    description:
      "Refined everyday fabrics designed for effortless style, versatile tailoring, and all-day comfort.",
    products: [
      { id: "nabeen-classic-oscar", name: "Oscar", image: "/images/gallery/04-charcoal-herringbone.jpg" },
      { id: "nabeen-classic-fantasy", name: "Fantasy", image: "/images/gallery/02-taupe-dobby.jpg" },
      { id: "nabeen-classic-delicacy", name: "Delicacy™", image: "/images/gallery/07-blush-stripe.jpg" },
      { id: "nabeen-classic-excelsor", name: "Excelsor", image: "/images/gallery/06-mint-dobby.jpg" },
      { id: "nabeen-classic-spencer", name: "Spencer", image: "/images/gallery/10-slate-rib.jpg" },
      { id: "nabeen-classic-golden-arc", name: "Golden Arc", image: "/images/gallery/05-camel-check-jacquard.jpg" },
      { id: "nabeen-classic-four-corners", name: "Four Corners", image: "/images/gallery/08-champagne-check.jpg" },
    ],
  },
  {
    number: "02",
    name: "Nabeen Royale",
    description:
      "The Royale collection represents the finest expression of Nabeen — crafted for those who appreciate distinction, quality and timeless style.",
    products: [
      { id: "nabeen-royale-star-rose", name: "Star Rose", image: "/images/gallery/swatch-star-rose.jpg" },
      { id: "nabeen-royale-mark-polo", name: "Mark Polo", image: "/images/gallery/swatch-mark-polo.jpg" },
      { id: "nabeen-royale-cotton-house-giza", name: "Cotton House Egyptian Giza", image: "/images/gallery/03-white-jacquard.jpg" },
      { id: "nabeen-royale-silver-rock", name: "Silver Rock", image: "/images/gallery/swatch-silver-rock.jpg" },
      { id: "nabeen-royale-sicora-luxe-harrier", name: "Sicora, Luxe and Harrier", image: "/images/gallery/09-sky-circle-jacquard.jpg" },
      { id: "nabeen-royale-president-vp", name: "President & Vice President", image: "/images/gallery/swatch-president.jpg" },
    ],
  },
  {
    number: "03",
    name: "Nabeen Luxuré",
    description:
      "Sophisticated contemporary weaves, premium wool blends, and international craftsmanship for discerning connoisseurs.",
    products: [
      { id: "nabeen-luxure-zare-nx", name: "Zare NX", image: "/images/gallery/01-aqua-jacquard.jpg" },
      { id: "nabeen-luxure-trident", name: "Trident", image: "/images/gallery/04-charcoal-herringbone.jpg" },
      { id: "nabeen-luxure-morocco", name: "Morocco", image: "/images/gallery/05-camel-check-jacquard.jpg" },
      { id: "nabeen-luxure-gold-pearl", name: "Gold Pearl", image: "/images/gallery/08-champagne-check.jpg" },
      { id: "nabeen-luxure-lenova-zx", name: "Lenova ZX", image: "/images/gallery/02-taupe-dobby.jpg" },
      { id: "nabeen-luxure-millionaire", name: "Millionaire", image: "/images/gallery/swatch-president.jpg" },
      { id: "nabeen-luxure-switzerland-look", name: "Switzerland Look", image: "/images/gallery/03-white-jacquard.jpg" },
      { id: "nabeen-luxure-australian-wool", name: "Australian, Turkish Wool", image: "/images/gallery/swatch-silver-rock.jpg" },
    ],
  },
  {
    number: "04",
    name: "Nabeen White",
    description:
      "The pinnacle of white luxury fabrics, from immaculate Egyptian Giza cotton to intricate jacquard weaves.",
    products: [
      { id: "nabeen-white-white-fantasy", name: "Fantasy", image: "/images/gallery/swatch-white-fantasy.jpg" },
      { id: "nabeen-white-white-marconi", name: "Marconi", image: "/images/gallery/swatch-white-marconi.jpg" },
      { id: "nabeen-white-white-silver-rock", name: "Silver Rock", image: "/images/gallery/swatch-white-silver-rock.jpg" },
      { id: "nabeen-white-white-vice-president", name: "Vice President", image: "/images/brand-imagery/white-fabric-closing.jpg" },
      { id: "nabeen-white-president-plain-giza", name: "President Plain Giza", image: "/images/gallery/03-white-jacquard.jpg" },
    ],
  },
];

export function SignatureLines({
  images,
}: {
  lines?: { name: string; products: string[] }[];
  images?: Record<string, { src: string; alt?: string; title?: string }>;
}) {
  const isDesktop = useMediaQuery("(min-width: 64rem)");
  const [open, setOpen] = useState(0); // Default to 01 Nabeen Classic
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const [zoomedProduct, setZoomedProduct] = useState<{
    product: ProductSwatch;
    collectionName: string;
  } | null>(null);
  const id = useId();
  const reduceMotion = useReducedMotion();

  const zoomRef = useRef<HTMLDivElement>(null);
  useOverlay(`swatch-zoom-${id}`, zoomedProduct !== null);
  useFocusTrap(zoomRef, zoomedProduct !== null, () => setZoomedProduct(null), "button");

  const collections = SIGNATURE_COLLECTIONS.map((col) => ({
    ...col,
    products: col.products.map((prod) => ({
      ...prod,
      name: prod.id && images?.[prod.id]?.title?.trim() ? images[prod.id].title!.trim() : prod.name,
      image: prod.id && images?.[prod.id]?.src ? images[prod.id].src : prod.image,
    })),
  }));

  const activeCollection = collections[open] ?? collections[0];

  return (
    <>
      {isDesktop ? (
        <div className="grid grid-cols-[21rem_1fr] gap-10 lg:gap-14">
          {/* Left Tab List */}
          <div
            role="tablist"
            aria-label="Signature Collections"
            className="flex flex-col gap-2.5 border-r border-line/70 pr-8"
          >
            {collections.map((line, index) => {
              const isSelected = index === open;
              return (
                <button
                  key={line.name}
                  type="button"
                  role="tab"
                  id={`${id}-tab-${index}`}
                  aria-selected={isSelected}
                  aria-controls={`${id}-panel-${index}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setOpen(index)}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
                    event.preventDefault();
                    const next =
                      event.key === "ArrowDown"
                        ? (open + 1) % SIGNATURE_COLLECTIONS.length
                        : (open - 1 + SIGNATURE_COLLECTIONS.length) % SIGNATURE_COLLECTIONS.length;
                    setOpen(next);
                    document.getElementById(`${id}-tab-${next}`)?.focus();
                  }}
                  className={`group relative flex w-full items-center justify-between rounded-xl px-5 py-4 text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-slate-200/50 shadow-sm border border-slate-300/60"
                      : "hover:bg-slate-200/30 text-slate-600 hover:text-navy"
                  }`}
                >
                  {/* Active left indicator bar */}
                  {isSelected && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-navy"
                    />
                  )}

                  <div className="flex items-center gap-4">
                    <span
                      className={`font-sans text-xs font-semibold tracking-wider transition-colors ${
                        isSelected ? "text-navy" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    >
                      {line.number}
                    </span>
                    <span
                      className={`block font-sans text-lg sm:text-xl font-normal leading-tight transition-colors ${
                        isSelected ? "font-medium text-navy-deep" : "text-navy group-hover:text-navy-deep"
                      }`}
                    >
                      {withReg(line.name)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Active Panel */}
          <div className="min-h-[22rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={open}
                role="tabpanel"
                id={`${id}-panel-${open}`}
                aria-labelledby={`${id}-tab-${open}`}
                tabIndex={0}
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, rotateX: -12, y: 10 }
                }
                animate={{ opacity: 1, rotateX: 0, y: 0 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, rotateX: 12, y: -10 }
                }
                transition={{ duration: reduceMotion ? 0.01 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformPerspective: 800, transformOrigin: "top center" }}
              >
                <div className="border-b border-line/70 pb-4">
                  <h3 className="font-sans text-2xl sm:text-3xl text-navy-deep font-normal tracking-tight">
                    {withReg(activeCollection.name)}
                  </h3>
                  <p className="mt-2 text-sm sm:text-[15px] font-light leading-relaxed text-slate-600 max-w-2xl">
                    {activeCollection.description}
                  </p>
                </div>

                {/* Swatch Grid */}
                <div className="mt-6 grid grid-cols-2 gap-4 lg:gap-5">
                  {activeCollection.products.map((product) => (
                    <SwatchCard
                      key={product.name}
                      product={product}
                      onSelect={() =>
                        setZoomedProduct({
                          product,
                          collectionName: `${activeCollection.number} · ${activeCollection.name}`,
                        })
                      }
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      ) : (
        /* Mobile / Tablet Responsive Layout */
        <div className="space-y-4">
          {/* Mobile Horizontal Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {collections.map((line, index) => (
              <button
                key={line.name}
                type="button"
                onClick={() => setOpen(index)}
                aria-pressed={index === open}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-left text-sm transition-all cursor-pointer font-sans font-normal ${
                  index === open
                    ? "bg-navy text-white shadow-sm font-medium"
                    : "bg-white/80 text-slate-700 border border-line hover:bg-white"
                }`}
              >
                <span className="font-sans text-xs opacity-75">{line.number}</span>
                <span>{withReg(line.name)}</span>
              </button>
            ))}
          </div>

          {/* Mobile Active Collection Panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={open}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-line/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:p-5"
            >
              <div className="border-b border-line pb-3">
                <h3 className="font-sans text-2xl text-navy-deep font-normal mt-0.5">
                  {withReg(activeCollection.name)}
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 font-light leading-relaxed">
                  {activeCollection.description}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {activeCollection.products.map((product) => (
                  <SwatchCard
                    key={product.name}
                    product={product}
                    onSelect={() =>
                      setZoomedProduct({
                        product,
                        collectionName: `${activeCollection.number} · ${activeCollection.name}`,
                      })
                    }
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Enlarged Fabric Zoom Lightbox Modal rendered via Portal in document.body for full viewport coverage & perfect centering */}
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {zoomedProduct && (
              <motion.div
                key="zoom-modal"
                ref={zoomRef}
                tabIndex={-1}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setZoomedProduct(null)}
                className="fixed inset-0 z-[80] flex items-center justify-center bg-navy-deep/80 p-4 sm:p-6 backdrop-blur-md cursor-zoom-out"
                role="dialog"
                aria-modal="true"
                aria-label={`Enlarged view of ${zoomedProduct.product.name}`}
              >
                <motion.div
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 10 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => {
                    // Clicking on the modal container/image toggles zoom out back to normal
                    setZoomedProduct(null);
                  }}
                  className="relative flex max-h-[85vh] w-full max-w-md sm:max-w-lg md:max-w-xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl cursor-pointer"
                >
                  {/* Header with Title and Close Button */}
                  <div
                    className="flex items-center justify-between border-b border-line bg-white/95 px-4 py-3 sm:px-5 sm:py-3.5 backdrop-blur-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        {withReg(zoomedProduct.collectionName)}
                      </span>
                      <h3 className="font-sans text-base font-medium text-navy-deep sm:text-lg">
                        {withReg(zoomedProduct.product.name)}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setZoomedProduct(null)}
                      aria-label="Close zoomed view"
                      className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-navy cursor-pointer"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </div>

                  {/* Large Fabric Image Preview */}
                  <div className="relative aspect-[4/3] w-full bg-slate-100 sm:aspect-[16/11]">
                    <Image
                      src={zoomedProduct.product.image}
                      alt={zoomedProduct.product.name}
                      fill
                      sizes="(max-width: 640px) 90vw, (max-width: 1024px) 520px, 576px"
                      quality={95}
                      priority
                      className="object-cover"
                    />
                  </div>

                  {/* Bottom hint */}
                  <div className="border-t border-line/60 bg-slate-50/90 px-4 py-2 text-center text-xs text-slate-500 sm:px-5">
                    Click anywhere to close
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function SwatchCard({
  product,
  onSelect,
}: {
  product: ProductSwatch;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`View enlarged ${product.name} fabric swatch`}
      className="group relative flex w-full items-center gap-3.5 rounded-lg border border-line/80 bg-white/90 p-3 text-left shadow-xs backdrop-blur-xs transition-all duration-200 hover:border-slate-400 hover:bg-white hover:shadow-md cursor-pointer"
    >
      {/* Fabric Swatch Thumbnail with contrast border and framing */}
      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md border border-slate-300/90 bg-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.08)] sm:h-16 sm:w-24">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 80px, 96px"
          quality={88}
          className="object-cover transition-transform duration-300 group-hover:scale-105 brightness-[0.98] contrast-[1.04]"
        />
        {/* Subtle zoom indicator on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-navy-deep/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <ZoomIn className="h-4 w-4 text-white drop-shadow" />
        </div>
      </div>

      {/* Swatch Name (Open Sans Normal, no subheadings, no arrow) */}
      <div className="min-w-0 flex-1">
        <h4 className="break-words font-sans text-base sm:text-lg font-normal text-navy-deep transition-colors group-hover:text-navy">
          {withReg(product.name)}
        </h4>
      </div>
    </button>
  );
}

/** SSR renders the phone layout; desktop takes over on hydration. */
function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

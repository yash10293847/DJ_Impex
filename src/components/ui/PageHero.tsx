import Image from "next/image";
import type { ReactNode } from "react";

import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { WeaveArt, type WeavePattern } from "@/components/ui/WeaveArt";

/**
 * The inner-page hero: fabric/photograph display with dark navy overlay matching the footer,
 * the H1 set bottom-left.
 */
export function PageHero({
  title,
  strapline,
  image,
  alt,
  pending,
  pattern,
  objectPosition = "center",
  straplineClassName,
  overlay = true,
}: {
  title: ReactNode;
  strapline?: ReactNode;
  image?: string;
  alt?: string;
  /** Shown instead of a photograph while the real image is pending. */
  pending?: string;
  /**
   * Draw the cloth instead of using a photograph. The gallery scans are 480px,
   * which ASSETS.md marks as tile-sized and not for large use; upscaling one
   * across a full-bleed hero looks worse than drawing the weave.
   */
  pattern?: WeavePattern;
  objectPosition?: string;
  straplineClassName?: string;
  overlay?: boolean;
}) {
  return (
    <section
      data-hero
      className="on-dark relative flex h-auto min-h-[16rem] items-end overflow-hidden bg-navy-deep text-white sm:min-h-[18rem] md:min-h-[22rem]"
    >
      {pattern && !image ? (
        <WeaveArt pattern={pattern} scale={1.35} />
      ) : image ? (
        <Image
          src={image}
          alt={alt ?? ""}
          fill
          priority
          sizes="100vw"
          quality={88}
          className={`pointer-events-none object-cover ${overlay ? "brightness-75" : ""}`}
          style={{ objectPosition }}
          unoptimized={image.startsWith("/api/")}
        />
      ) : (
        <div className="absolute inset-0">
          <ImagePlaceholder pending={pending ?? "page hero photograph"} />
        </div>
      )}

      {/* Rich dark navy overlay matching footer to ensure identical contrast and tone */}
      {overlay ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-navy-deep/80" /> : null}

      <div className="container-site relative w-full pb-7 pt-24 [text-shadow:0_2px_12px_rgba(0,0,0,0.6)] sm:pb-8 sm:pt-26 md:pb-9 md:pt-28">
        <h1 className="t-h1 max-w-none">{title}</h1>
        {strapline ? (
          <p className={`t-lead mt-3 max-w-none !text-white sm:mt-4 ${straplineClassName ?? ""}`}>{strapline}</p>
        ) : null}
      </div>
    </section>
  );
}

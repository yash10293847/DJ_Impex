"use client";

import Image from "next/image";
import { HeroBackgroundVideo } from "@/components/ui/HeroBackgroundVideo";

import { withReg } from "@/components/ui/Reg";

export function VisionBanner({
  title,
  strapline,
  videoSrc = "/video/about-video.mp4",
  poster = "/video/luxury-in-every-thread.jpg",
  showOverlay = false,
  preserveFrame = true,
}: {
  title: string;
  strapline?: string;
  videoSrc?: string;
  poster?: string;
  showOverlay?: boolean;
  preserveFrame?: boolean;
}) {
  const isVideo = !videoSrc.match(/\.(jpg|jpeg|png|webp|avif)$/i);

  return (
    <section
      data-hero
      aria-labelledby="about-banner-title"
      className={`site-hero on-dark relative h-[82svh] min-h-[32rem] w-full max-w-full overflow-hidden bg-navy-deep text-white sm:h-[100dvh] sm:min-h-[36rem] ${preserveFrame ? "about-banner--preserve-frame" : ""}`}
    >
      {/* Video / Background Layer extending to top edge */}
      <div className="about-banner__media absolute inset-0 h-full w-full overflow-hidden">
        {isVideo ? (
          <HeroBackgroundVideo
            key={videoSrc}
            src={videoSrc}
            label="About video"
            poster={poster}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : (
          <Image
            src={videoSrc}
            alt=""
            fill
            priority
            sizes="100vw"
            quality={88}
            className="object-cover object-center"
          />
        )}
      </div>

      <div className={showOverlay ? "container-site relative z-20 mx-auto px-4 text-center" : "sr-only"}>
        <h1 id="about-banner-title">{withReg(title)}</h1>
        {strapline ? <p>{withReg(strapline)}</p> : null}
      </div>
    </section>
  );
}

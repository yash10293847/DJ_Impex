import type { Metadata } from "next";
import Image from "next/image";

import { RecognitionSection } from "@/components/about/RecognitionSection";
import { WelcomeSection } from "@/components/about/WelcomeSection";
import { VisionBanner } from "@/components/vision/VisionBanner";
import { VisionPillars } from "@/components/vision/VisionPillars";
import { ExploreNabeenCTA } from "@/components/ui/ExploreNabeenCTA";
import { withReg } from "@/components/ui/Reg";
import { getPage } from "@/lib/content";
import { field, section } from "@/lib/markdown";
import { buildMetadata, pageTitle } from "@/lib/seo";
import { slotMap } from "@/lib/slots";

export const metadata: Metadata = buildMetadata({
  title: pageTitle("About D J Impex & Co. & Our Vision"),
  description:
    "D J Impex & Co. has sourced, manufactured, supplied and traded fabric from Mumbai since 1995, exporting to Africa and the Middle East under the brand Nabeen®. Guided by our five foundational pillars.",
  path: "/about",
});

export default async function AboutPage() {
  const about = getPage("about");
  const aboutHead = section(about, "about-d-j-impex-co-dji") || section(about, "about-dj-impex-co-dji");

  const vision = getPage("vision");
  const visionHead = section(vision, "our-vision");
  const pillars = section(vision, "the-five-pillars");

  const fallbackTitle = field(aboutHead, "page-title-h1") || "About D J Impex & Co.";
  const fallbackStrapline = field(aboutHead, "strapline") || "Empowering the textile industry with high-quality fabrics.";

  const slots = await slotMap();
  const videoSlot = slots["about-video"];

  const title = videoSlot?.title || fallbackTitle;
  const strapline = videoSlot?.description || fallbackStrapline;
  const videoSrc = videoSlot?.src || "/video/about-video.mp4";
  const poster = videoSlot?.poster || "/video/luxury-in-every-thread.jpg";

  return (
    <>
      <VisionBanner
        title={title}
        strapline={strapline}
        videoSrc={videoSrc}
        poster={poster}
        showOverlay={false}
        preserveFrame={true}
      />

      <WelcomeSection />
      <RecognitionSection />

      {/* Five Pillars & Explore Collection with seamless white fabric drape background */}
      <div className="relative overflow-hidden bg-white">
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
          <VisionPillars
            heading={pillars.heading}
            intro={withReg(field(visionHead, "intro"))}
            items={pillars.items}
          />
          <ExploreNabeenCTA bg="bg-transparent" />
        </div>
      </div>
    </>
  );
}

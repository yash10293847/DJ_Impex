import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { getPage, getSite } from "@/lib/content";
import { field, section } from "@/lib/markdown";
import { BriefAnimated } from "@/components/home/BriefAnimated";
import { slotMap } from "@/lib/slots";
import { StatBoxes } from "@/components/home/StatBoxes";

export async function BriefSection() {
  const site = getSite();
  const slot = (await slotMap())["home-brief"];
  const brief = section(getPage("home"), "3-short-brief");
  const heading = field(brief, "heading") || "MORE THAN A FABRIC | A SIGNATURE OF DISTINCTION.";
  const linkLabel = field(brief, "link").split("→")[0].replace(/"/g, "").trim() || "Discover our story";
  const tagline = brief.fields["tagline"] || "Crafted In India · Chosen Across Africa";

  return (
    /* The hero above is full height and ends on a hard edge, so this does not
       need a full --spacing-section on top of it: at 1130 that was 127px of
       white before the heading. 64/80px instead. */
    <section className="relative overflow-hidden bg-white pt-10 sm:pt-14 lg:pt-20">
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
      <Container className="relative z-10">
        <BriefAnimated
          title={heading}
          tagline={tagline}
          paragraphs={brief.paragraphs}
          linkLabel={linkLabel}
          imageSrc={slot.src}
          imageAlt={slot.alt}
        />
      </Container>

      {/* Full screen width 4-box stat section */}
      <div className="relative z-10 mt-12 w-full lg:mt-16">
        <StatBoxes />
      </div>
    </section>
  );
}

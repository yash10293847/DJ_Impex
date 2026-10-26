import type { Metadata } from "next";

import { AliNuhuGivesBack } from "@/components/nabeen/AliNuhuGivesBack";
import { AliNuhuMissionHeading } from "@/components/nabeen/AliNuhuMissionHeading";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { withReg } from "@/components/ui/Reg";
import { TrackedLink } from "@/components/ui/TrackedLink";
import { WhatsAppGlyph } from "@/components/ui/WhatsAppGlyph";
import { getPage, getSite } from "@/lib/content";
import { whatsappLink } from "@/lib/contact";
import { field, section } from "@/lib/markdown";
import { buildMetadata, pageTitle } from "@/lib/seo";
import { slotMap } from "@/lib/slots";

import { ExploreNabeenCTA } from "@/components/ui/ExploreNabeenCTA";

export const metadata: Metadata = buildMetadata({
  title: pageTitle("Nabeen x Ali Nuhu"),
  description:
    "Wear2Care x Ali Nuhu by Nabeen®: a collaboration with Nigeria's most cherished actor supporting child education and welfare across Nigeria.",
  path: "/nabeen-x-ali-nuhu",
});

export default async function AliNuhuPage() {
  const site = getSite();
  const page = getPage("nabeen-x-ali-nuhu");
  const head = section(page, "nabeen-x-ali-nuhu");
  const gives = section(page, "luxury-that-gives-back");
  const join = section(page, "join-the-mission-wear2care-wear2transform-lives");
  const slots = await slotMap();

  const heroSlot = slots["wear2care-hero"];
  const donation1Slot = slots["wear2care-donation-1"];
  const donation2Slot = slots["wear2care-donation-2"];

  const heroImage = heroSlot?.src || "/images/wear2care/handover.jpg";
  const heroAlt = heroSlot?.alt || site.wear2care.photos[0].alt;

  const photos = [
    {
      src: donation1Slot?.src || `/images/wear2care/${site.wear2care.photos[0].file}`,
      alt: donation1Slot?.alt || site.wear2care.photos[0].alt,
    },
    {
      src: donation2Slot?.src || `/images/wear2care/${site.wear2care.photos[1].file}`,
      alt: donation2Slot?.alt || site.wear2care.photos[1].alt,
    },
  ];

  return (
    <>
      <PageHero
        title={withReg(field(head, "h1"))}
        strapline={withReg(field(head, "strapline"))}
        image={heroImage}
        alt={heroAlt}
        objectPosition="center 32%"
        overlay={false}
      />

      <AliNuhuGivesBack heading={gives.heading} paragraphs={gives.paragraphs} photos={photos} />

      <section className="bg-mist pt-10 sm:pt-12 md:pt-16 pb-0">
        <Container>
          <AliNuhuMissionHeading heading={join.heading} />
          <div className="mt-8 grid gap-5">
            {join.paragraphs.map((paragraph) => (
              <p key={paragraph} className="measure text-slate">
                {withReg(paragraph)}
              </p>
            ))}
          </div>

          <p className="mt-10">
            <TrackedLink
              href={whatsappLink(
                "Hello Nabeen team, I was inspired by the Wear2Care initiative and would like to connect with your team.",
              )}
              event="whatsapp_click"
              location="cause"
              className="btn btn-primary"
            >
              <WhatsAppGlyph size={20} />
              <span>Enquire Now</span>
            </TrackedLink>
          </p>
        </Container>
      </section>

      <ExploreNabeenCTA bg="bg-mist" className="pt-10 sm:pt-12 pb-14 sm:pb-16" />
    </>
  );
}

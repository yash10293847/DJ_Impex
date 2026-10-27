import type { Metadata } from "next";
import Image from "next/image";

import { NabeenIntro } from "@/components/nabeen/NabeenIntro";
import { BrandFilm } from "@/components/ui/BrandFilm";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { withReg } from "@/components/ui/Reg";
import { SignatureLines } from "@/components/ui/SignatureLines";
import { getBrandFilm, getPage, getSite } from "@/lib/content";
import { slotMap } from "@/lib/slots";
import { field, section } from "@/lib/markdown";
import { buildMetadata, pageTitle } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: pageTitle("Nabeen®"),
  description:
    "Nabeen®: luxury fabrics by D J Impex & Co. Swiss-inspired designs, fine yarns and signature collections.",
  path: "/nabeen",
});

export const dynamic = "force-dynamic";

export default async function NabeenPage() {
  const site = getSite();
  const slots = await slotMap();
  const heroSlot = slots["about-hero"];
  const page = getPage("nabeen");
  const head = section(page, "nabeen");
  const intro = section(page, "introduction");
  const promise = section(page, "brand-promise-brochure-p-3");
  const film = getBrandFilm();

  // The brochure runs "Honesty · Integrity · Human dignity. Nabeen stands for
  // Trust, Quality and Excellence." The three words are set large; the first
  // three read as a sentence, because the design system forbids middle dots.
  const coreValues = site.values.slice(0, 3);
  const standsFor = site.values.slice(3);
  const coreLine = `${coreValues.slice(0, -1).join(", ")} and ${coreValues.at(-1)}.`.toLowerCase();

  const heroImage = heroSlot?.src || "/images/footer/fabric-banner.jpg";
  const heroAlt = heroSlot?.alt || "Nabeen Luxury Fabrics";
  const heroTitle = heroSlot?.replaced && heroSlot.title ? heroSlot.title : field(head, "h1");
  const heroStrapline = heroSlot?.replaced && heroSlot.description ? heroSlot.description : field(head, "strapline");

  return (
    <>
      <PageHero
        title={withReg(heroTitle)}
        strapline={withReg(heroStrapline)}
        image={heroImage}
        alt={heroAlt}
        objectPosition="center 25%"

      />

      <NabeenIntro paragraphs={intro.paragraphs} coreLine={coreLine} values={standsFor} />

      {/* The client's own film of the cloth with the Brand Promise quote integrated beside it */}
      <BrandFilm
        src={film.src}
        poster={film.poster}
        caption={film.caption}
        heading="Not All Whites Are Made Equal"
        quote={promise.paragraphs[0]}
        signoff={field(promise, "sign-off")}
      />

      {/* Signature Lines Collections Showcase with clean visible fabric background */}
      <section className="relative overflow-hidden bg-white py-12 sm:py-16 md:py-20">
        {/* Luxury fabric background drape with high clarity */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image
            src="/images/brand-imagery/signature-lines-bg.jpg"
            alt=""
            fill
            sizes="100vw"
            quality={88}
            className="object-cover object-right-top opacity-85"
          />
          {/* Subtle gradient veil to keep the left text area crisp while letting fabric folds shine through on the right */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-white via-white/65 to-transparent"
          />
        </div>

        <Container className="relative z-10">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase sm:text-xs">
              Our Collections
            </p>
            <h2 className="mt-2 font-sans text-3xl font-normal tracking-tight text-navy-deep sm:text-4xl md:text-5xl">
              Nabeen Signature Lines
            </h2>
          </div>

          <div className="mt-8 sm:mt-10">
            <SignatureLines images={slots} />
          </div>
        </Container>
      </section>

      {/* Luxury white fabric framed card - widened horizontally with generous spacing above */}
      <section className="bg-mist pb-12 pt-12 sm:pb-16 sm:pt-16 md:pb-20 md:pt-20">
        <Container>
          <div className="nabeen-closing relative mx-auto w-full max-w-6xl overflow-hidden rounded-xl border border-line/80 bg-white shadow-[var(--shadow-float)]">
            {/* White luxury jacquard fabric background */}
            <Image
              src="/images/brand-imagery/white-fabric-closing.jpg"
              alt=""
              fill
              sizes="(max-width: 1280px) 100vw, 1280px"
              quality={88}
              className="pointer-events-none object-cover object-center brightness-105"
            />
            {/* Soft semi-translucent veil for crystal-clear readability */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-white/85 backdrop-blur-[0.5px]"
            />

            {/* Inner elegant double frame */}
            <div className="relative m-2.5 rounded-lg border border-slate/25 px-5 py-5 text-center sm:m-3.5 sm:px-8 sm:py-7 md:px-12 md:py-8">
              <h2 className="t-h2 max-w-none text-[clamp(1.35rem,1.1rem+1.1vw,2.15rem)] font-normal leading-snug text-navy-deep">
                <span className="block">Choose Nabeen: Woven With Excellence,</span>
                <span className="block mt-1 sm:mt-1.5">
                  And Infused With A Touch Of <em className="font-sans italic text-navy">African Elegance.</em>
                </span>
              </h2>

              <p className="mx-auto mt-3 max-w-4xl text-[clamp(0.975rem,0.9rem+0.3vw,1.1rem)] font-light leading-relaxed text-slate-700">
                Our dedicated commitment to quality, style, and customer satisfaction drives us to create your lifestyle fabrics. The consistent and exceptional quality is vividly exhibited through the texture of the fabric and the luxurious feel therein.
              </p>

              <p className="mx-auto mt-3 max-w-3xl text-[clamp(1rem,0.925rem+0.35vw,1.175rem)] font-normal leading-relaxed text-navy">
                Welcome to the world of Nabeen luxury fabrics — where quality, trend and tradition seamlessly unite.
              </p>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

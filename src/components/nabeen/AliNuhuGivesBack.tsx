"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

import { Container } from "@/components/ui/Container";
import { withReg } from "@/components/ui/Reg";

type Photo = { file?: string; src?: string; alt: string };

export function AliNuhuGivesBack({
  heading,
  paragraphs,
  photos,
}: {
  heading: string;
  paragraphs: string[];
  photos: Photo[];
}) {
  const reduceMotion = useReducedMotion();
  const enter = (x: number, delay = 0) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, x: `var(${x < 0 ? "--reveal-distance-negative" : "--reveal-distance"},${x}px)` },
    whileInView: { opacity: 1, x: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: reduceMotion ? 0.01 : 1.2, delay, ease: [0.22, 0.61, 0.36, 1] as const },
  });

  return (
    <section className="relative overflow-hidden bg-white pt-8 pb-10 sm:pt-12 sm:pb-12 md:pt-14 md:pb-16">
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
        <div>
          <motion.h2 className="t-h2 max-w-none" {...enter(-48)}>
            {withReg(heading)}
          </motion.h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2 md:gap-8">
            {paragraphs.map((paragraph, index) => (
              <motion.p
                key={paragraph}
                className="measure text-slate"
                {...enter(index === 0 ? -42 : 42, index * 0.12)}
              >
                {withReg(paragraph)}
              </motion.p>
            ))}
          </div>
        </div>

        <ul className="mt-8 grid gap-6 sm:mt-10 md:grid-cols-2 md:gap-8">
          {photos.map((photo, index) => {
            const src = photo.src || (photo.file?.startsWith("/") ? photo.file : `/images/wear2care/${photo.file}`);
            return (
              <motion.li
                key={photo.file || photo.src || index}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 52 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.18 }}
                transition={{ duration: reduceMotion ? 0.01 : 0.75, delay: index * 0.12, ease: [0.22, 0.61, 0.36, 1] }}
              >
                <figure className="relative aspect-[4/3] w-full overflow-hidden bg-mist">
                  <Image
                    src={src}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 46vw"
                    className="object-cover"
                    unoptimized={src.startsWith("/api/")}
                  />
                </figure>
              </motion.li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

"use client";

import Image from "next/image";
import { Award, Handshake, TrendingUp } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

import { Container } from "@/components/ui/Container";
import { withReg } from "@/components/ui/Reg";
import { useMediaQuery } from "@/lib/useMediaQuery";

const valueIcons = [Handshake, Award, TrendingUp];

export function NabeenIntro({
  paragraphs,
  coreLine,
  values,
}: {
  paragraphs: string[];
  coreLine: string;
  values: string[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const compact = useMediaQuery("(max-width: 1023px)");

  // Connect animations directly to user's scroll progress through this section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 88%", "center 45%"],
  });

  // Heading glides in smoothly from the left as user scrolls
  const headingX = useTransform(scrollYProgress, [0, 0.6], reduceMotion ? [0, 0] : [compact ? -12 : -75, 0]);
  const headingOpacity = useTransform(scrollYProgress, [0, 0.5], reduceMotion ? [1, 1] : [0, 1]);

  // Paragraph 1 glides up smoothly from the bottom as user scrolls
  const para1Y = useTransform(scrollYProgress, [0.15, 0.75], reduceMotion ? [0, 0] : [55, 0]);
  const para1Opacity = useTransform(scrollYProgress, [0.15, 0.65], reduceMotion ? [1, 1] : [0, 1]);

  // Paragraph 2 glides up smoothly from the bottom sequentially as user scrolls
  const para2Y = useTransform(scrollYProgress, [0.3, 0.9], reduceMotion ? [0, 0] : [55, 0]);
  const para2Opacity = useTransform(scrollYProgress, [0.3, 0.8], reduceMotion ? [1, 1] : [0, 1]);

  // Values on the right glide in smoothly from the right
  const valuesX = useTransform(scrollYProgress, [0.2, 0.85], reduceMotion ? [0, 0] : [compact ? 12 : 65, 0]);
  const valuesOpacity = useTransform(scrollYProgress, [0.2, 0.75], reduceMotion ? [1, 1] : [0, 1]);

  return (
    <section ref={containerRef} className="relative overflow-hidden bg-white py-14 sm:py-18 md:py-24">
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
        <div className="grid min-w-0 gap-10 lg:grid-cols-[1.3fr_0.9fr] lg:gap-20 xl:gap-28">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-slate uppercase">About Nabeen</p>
            <span aria-hidden="true" className="mt-5 block h-px w-12 bg-accent" />

            {/* Heading smoothly moves from the left tied to scroll */}
            <motion.h2
              style={{ x: headingX, opacity: headingOpacity }}
              className="mt-6 max-w-none font-sans text-[clamp(1.9rem,1.2rem+3vw,3rem)] leading-[1.12] tracking-[-0.025em] text-navy lg:mt-8 lg:text-[clamp(2.6rem,3.3vw,4.35rem)] lg:leading-[0.98] lg:tracking-[-0.035em]"
            >
              <span className="block lg:whitespace-nowrap">A Global Fabric Brand</span>
              <span className="block lg:whitespace-nowrap">with a Deeper Purpose</span>
            </motion.h2>

            {/* Paragraphs smoothly move up from the bottom tied to scroll */}
            <div className="mt-6 grid max-w-2xl gap-5 text-base leading-relaxed text-slate lg:mt-10 lg:gap-7 lg:text-[clamp(1.05rem,0.98rem+0.3vw,1.22rem)]">
              {paragraphs.map((paragraph, index) => {
                const y = index === 0 ? para1Y : para2Y;
                const opacity = index === 0 ? para1Opacity : para2Opacity;
                return (
                  <motion.p key={paragraph} style={{ y, opacity }}>
                    {withReg(paragraph)}
                  </motion.p>
                );
              })}
            </div>
          </div>

          {/* Right Column: Values smoothly move from the right tied to scroll */}
          <motion.div
            style={{ x: valuesX, opacity: valuesOpacity }}
            className="min-w-0 border-t border-line pt-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-14"
          >
            <p className="text-xs font-semibold tracking-[0.22em] text-slate uppercase">Our Values</p>
            <span aria-hidden="true" className="mt-5 block h-px w-12 bg-accent" />
            <p className="mt-8 max-w-md text-[clamp(1rem,0.94rem+0.25vw,1.15rem)] leading-relaxed text-slate">
              {withReg(`Nabeen${"\u00AE"} is built on ${coreLine} It stands for:`)}
            </p>
            <ul className="mt-7 grid gap-5 lg:mt-10 lg:gap-9">
              {values.map((value, index) => {
                const Icon = valueIcons[index] ?? Award;
                return (
                  <li key={value} className="flex items-center gap-5 sm:gap-6">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-mist text-navy lg:size-[5.25rem]">
                      <Icon aria-hidden="true" size={35} strokeWidth={1.4} />
                    </span>
                    <span>
                      <span className="block font-sans text-[clamp(1.5rem,1.1rem+2vw,2rem)] leading-tight tracking-[-0.025em] text-navy lg:text-[clamp(2.15rem,2.3vw,3.35rem)] lg:leading-none lg:tracking-[-0.035em]">
                        {value}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

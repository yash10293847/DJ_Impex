"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { withReg } from "@/components/ui/Reg";
import { TbcTag } from "@/components/ui/TbcTag";
import { TextLink } from "@/components/ui/TextLink";
import type { Post } from "@/lib/content";

interface SectionData {
  heading?: string;
  paragraphs: string[];
}

function parseMarkdownSections(markdown: string): SectionData[] {
  const lines = markdown.split("\n");
  const sections: SectionData[] = [];
  let currentHeading: string | undefined = undefined;
  let currentParagraphs: string[] = [];
  let currentBuffer: string[] = [];

  const flushBuffer = () => {
    if (currentBuffer.length > 0) {
      const text = currentBuffer.join(" ").trim();
      if (text) {
        currentParagraphs.push(text);
      }
      currentBuffer = [];
    }
  };

  const flushSection = () => {
    flushBuffer();
    if (currentHeading || currentParagraphs.length > 0) {
      sections.push({
        heading: currentHeading,
        paragraphs: [...currentParagraphs],
      });
      currentHeading = undefined;
      currentParagraphs = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      flushSection();
      currentHeading = trimmed.replace(/^##\s+/, "").trim();
    } else if (trimmed === "") {
      flushBuffer();
    } else {
      currentBuffer.push(trimmed);
    }
  }

  flushSection();
  return sections;
}

export function JournalArticleAnimated({ post }: { post: Post }) {
  const reduceMotion = useReducedMotion();
  const ease = [0.22, 1, 0.36, 1] as const;
  const sections = parseMarkdownSections(post.body);

  return (
    <article className="relative overflow-hidden bg-white">
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

      <div className="relative z-10">
      {/* Article Header */}
        <header className="bg-transparent pb-12 pt-[calc(4.5rem+var(--spacing-section)/2)] lg:pt-[calc(5.25rem+var(--spacing-section)/2)]">
        <div className="container-site">
          <p className="t-small flex flex-wrap items-center gap-x-3 text-slate">
            <Link href="/journal" className="text-link">
              The Fabric Journal
            </Link>
            <span aria-hidden="true">·</span>
            <span>{post.category}</span>
            <span aria-hidden="true">·</span>
            <span>{post.readingMinutes} min read</span>
          </p>

          <h1 className="t-h1 mt-6 max-w-none [text-wrap:pretty]">
            {withReg(post.title)}
            <TbcTag
              status={post.titleStatus ?? "confirmed"}
              note={post.suggestedTitle ? `Suggested: ${post.suggestedTitle}` : undefined}
            />
          </h1>
          <p className="t-lead measure mt-6 text-slate">{withReg(post.excerpt)}</p>
        </div>
      </header>

      {/* Fabric Cover Media — Animated from Upper-Left */}
      <motion.div
        className="container-site my-4"
        initial={{ opacity: 0, y: reduceMotion ? 0 : -35, x: reduceMotion ? 0 : "var(--reveal-distance-negative,-25px)" }}
        whileInView={{ opacity: 1, y: 0, x: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.85, ease }}
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-mist shadow-sm md:aspect-[21/9]">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
        </div>
      </motion.div>

      {/* 2-Section Content Layout: Left Heading from Left, Right Paragraphs from Right */}
        <div className="bg-transparent pt-8 pb-10 lg:pt-[clamp(3rem,2.5rem+3.5vw,5.5rem)]">
        <div className="container-site divide-y divide-line/60">
          {sections.map((section, idx) => (
            <div
              key={section.heading ?? `intro-${idx}`}
              className="grid min-w-0 gap-4 py-7 first:pt-0 last:pb-0 lg:grid-cols-12 lg:gap-14 xl:gap-16 lg:py-14"
            >
              {/* Left Column: Heading / Topic — Animated from Left */}
              <motion.div
                className="lg:col-span-5"
                initial={{ opacity: 0, x: reduceMotion ? 0 : "var(--reveal-distance-negative,-40px)" }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.75, delay: 0.1, ease }}
              >
                {section.heading ? (
                  <h2 className="font-semibold text-navy max-w-none lg:max-w-[18ch] text-[clamp(1.75rem,1.3rem+1.5vw,2.75rem)] leading-tight">
                    {withReg(section.heading)}
                  </h2>
                ) : (
                  <h2 className="font-semibold text-navy max-w-none lg:max-w-[18ch] text-[clamp(1.75rem,1.3rem+1.5vw,2.75rem)] leading-tight">
                    Overview
                  </h2>
                )}
              </motion.div>

              {/* Right Column: Paragraphs — Animated from Right */}
              <motion.div
                className="min-w-0 space-y-5 lg:col-span-7 lg:space-y-6"
                initial={{ opacity: 0, x: reduceMotion ? 0 : "var(--reveal-distance,40px)" }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.75, delay: 0.2, ease }}
              >
                {section.paragraphs.map((para, pIdx) => (
                  <p
                    key={pIdx}
                    className="text-base font-normal leading-[1.75] text-navy/85 sm:text-lg"
                  >
                    {withReg(para)}
                  </p>
                ))}
              </motion.div>
            </div>
          ))}

          {/* End of article lead-back */}
          <div className="pt-10">
            <p className="text-slate">
              Nabeen weaves the fabrics in this guide.{" "}
              <TextLink href="/about">Read our story</TextLink>, or{" "}
              <TextLink href="/#contact">talk to our team</TextLink> about your market.
            </p>
          </div>
        </div>
      </div>
      </div>
    </article>
  );
}

function PublishedDate({ post }: { post: Post }) {
  if (post.dateStatus === "hold") return null;
  const date = new Date(post.publishedAt);
  const label = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <span aria-hidden="true">·</span>
      <time dateTime={post.publishedAt}>{label}</time>
      <TbcTag status={post.dateStatus ?? "confirmed"} note="Publication date not yet confirmed" />
    </>
  );
}

"use client";

import { motion, useReducedMotion } from "motion/react";
import { TbcTag } from "@/components/ui/TbcTag";
import type { TrustMark } from "@/lib/site";

interface TrustMarksClientProps {
  marks: TrustMark[];
  className?: string;
}

function split(label: string): { lead: string; rest: string } {
  const sentence = (text: string) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : "");

  const number = /(\d[\d,]*\+?)/.exec(label);
  if (number) {
    const rest = label.replace(number[0], "").replace(/^since\s*/i, "").trim();
    return { lead: number[0], rest: sentence(rest) || "Founded" };
  }

  if (label.length <= 13) return { lead: label, rest: "" };

  const [first, ...remainder] = label.split(" ");
  return { lead: first, rest: sentence(remainder.join(" ")) };
}

export function TrustMarksClient({ marks, className = "" }: TrustMarksClientProps) {
  const reduceMotion = useReducedMotion();
  const ease = [0.22, 0.61, 0.36, 1] as const;

  return (
    <dl className={`relative grid gap-7 pl-8 ${className}`.trim()}>
      {/* Animated vertical blue line starting from 0 to full length */}
      <motion.span
        aria-hidden="true"
        initial={reduceMotion ? false : { scaleY: 0, opacity: 0 }}
        whileInView={{ scaleY: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: reduceMotion ? 0 : 0.85, delay: reduceMotion ? 0 : 0.2, ease }}
        style={{ transformOrigin: "top" }}
        className="absolute left-0 top-0 bottom-0 w-px bg-accent"
      />

      {marks.map((mark) => {
        const { lead, rest } = split(mark.label);
        return (
          <div key={mark.label}>
            <dt className="t-number text-[clamp(2.25rem,1.6rem+1.9vw,3.25rem)] leading-none">
              {lead}
              <TbcTag status={mark.status} />
            </dt>
            {rest ? <dd className="t-small mt-1.5 text-slate">{rest}</dd> : null}
          </div>
        );
      })}
    </dl>
  );
}

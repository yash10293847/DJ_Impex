"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAnyOverlayOpen, useOverlay } from "@/components/layout/OverlayContext";
import { withReg } from "@/components/ui/Reg";
import { TrackedLink } from "@/components/ui/TrackedLink";
import { WhatsAppGlyph } from "@/components/ui/WhatsAppGlyph";
import { track } from "@/lib/analytics";
import { useFocusTrap } from "@/lib/useFocusTrap";

const DEFAULT_POPUP_WHATSAPP =
  "https://wa.me/919819693626?text=Hello%20Nabeen%20team%2C%20I%E2%80%99m%20interested%20in%20your%20fabrics.%20Please%20share%20available%20designs%2C%20prices%2C%20and%20order%20details.";

/**
 * The welcome pop-up: centered luxury card with Nabeen mark, rule, brand statement,
 * and action button that opens WhatsApp directly with a prefilled enquiry message.
 *
 * Appears automatically every time the page is loaded/refreshed after delaySeconds.
 */
export function ContactPopup({
  whatsappHref = DEFAULT_POPUP_WHATSAPP,
  line = "Wrap Yourself in Opulence with the Finest African-Inspired Luxury Fabrics by Nabeen®",
  cta = "WhatsApp us",
  delaySeconds = 5,
}: {
  whatsappHref?: string;
  line?: string;
  cta?: string;
  delaySeconds?: number;
  fabrics?: string[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const otherOverlayOpen = useAnyOverlayOpen("welcome-popup");
  const hasOpened = useRef(false);

  useOverlay("welcome-popup", open);

  const close = useCallback(
    (reason: "dismiss" | "success") => {
      setOpen(false);
      if (reason === "dismiss") track("popup_dismiss", { path: pathname });
    },
    [pathname],
  );

  useEffect(() => {
    if (otherOverlayOpen || hasOpened.current) return;
    const timer = window.setTimeout(() => {
      hasOpened.current = true;
      setOpen(true);
      track("popup_open", { path: window.location.pathname });
    }, (delaySeconds ?? 5) * 1000);

    return () => window.clearTimeout(timer);
  }, [delaySeconds, otherOverlayOpen]);

  useFocusTrap(panelRef, open, () => close("dismiss"));

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={() => close("dismiss")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.24 }}
            className="absolute inset-0 h-full w-full cursor-default bg-navy-deep/60 backdrop-blur-[2px]"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-popup-title"
            tabIndex={-1}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-[34rem] overflow-y-auto overscroll-contain rounded-xl bg-white px-5 py-6 text-center shadow-[var(--shadow-float)] sm:px-10 sm:py-10"
          >
            <button
              type="button"
              onClick={() => close("dismiss")}
              className="absolute right-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center text-slate transition-colors hover:text-navy"
            >
              <span className="visually-hidden">Close</span>
              <X aria-hidden="true" size={24} strokeWidth={1.5} />
            </button>

            <Image
              src="/images/logos/nabeen-logo-navy.png"
              alt="Nabeen, luxury fabrics by DJI"
              width={1088}
              height={345}
              priority
              className="mx-auto h-auto w-[min(15rem,60%)]"
            />

            <p
              id="contact-popup-title"
              className="my-7 border-y border-line py-5 text-[clamp(0.95rem,0.85rem+0.4vw,1.125rem)] leading-relaxed text-navy-mid sm:my-8 sm:py-5"
            >
              {withReg(line)}
            </p>

            <TrackedLink
              href={whatsappHref}
              event="whatsapp_click"
              location="popup"
              onClick={() => close("success")}
              className="inline-flex max-w-full min-h-11 cursor-pointer items-center justify-center gap-2.5 rounded bg-[var(--color-whatsapp)] px-7 py-3 text-sm font-semibold uppercase tracking-[0.06em] text-[var(--color-whatsapp-ink)] transition-opacity duration-[var(--duration-quick)] hover:opacity-90"
            >
              <WhatsAppGlyph size={18} className="shrink-0" />
              <span className="min-w-0 [overflow-wrap:anywhere]">{cta}</span>
            </TrackedLink>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

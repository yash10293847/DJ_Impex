"use client";

import { useAnyOverlayOpen } from "@/components/layout/OverlayContext";
import { TrackedLink } from "@/components/ui/TrackedLink";
import { WhatsAppGlyph } from "@/components/ui/WhatsAppGlyph";

/**
 * On every page: WhatsApp button, bottom-right, clear of the iOS home
 * indicator. Steps aside while any popup/modal is open.
 */
export function FloatingActions({
  whatsappHref,
}: {
  whatsappHref: string;
  directionsHref?: string;
}) {
  const overlayOpen = useAnyOverlayOpen();

  return (
    <div
      aria-hidden={overlayOpen}
      className={`fixed right-4 z-30 grid gap-3 transition-opacity duration-[var(--duration-base)] ${
        overlayOpen ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <TrackedLink
        href={whatsappHref}
        event="whatsapp_click"
        location="floating"
        aria-label="Enquire on WhatsApp"
        tabIndex={overlayOpen ? -1 : undefined}
        className="group relative flex h-12 w-12 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-whatsapp)] text-[var(--color-whatsapp-ink)] shadow-[var(--shadow-float)] transition-transform duration-[var(--duration-quick)] hover:-translate-y-0.5 sm:h-14 sm:w-14"
      >
        <WhatsAppGlyph size={24} />
      </TrackedLink>
    </div>
  );
}

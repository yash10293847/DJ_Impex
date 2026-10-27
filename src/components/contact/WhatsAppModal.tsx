"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { submitEnquiry } from "@/app/actions/enquiry";
import { useWhatsAppPopup } from "@/components/layout/OverlayContext";
import { WhatsAppGlyph } from "@/components/ui/WhatsAppGlyph";
import { track } from "@/lib/analytics";
import { COUNTRY_CODES, enquirySchema, IDLE } from "@/lib/enquiry";
import { useFocusTrap } from "@/lib/useFocusTrap";

const DEFAULT_FABRICS = [
  "Wool",
  "Atiku",
  "Suiting",
  "Jacquard",
  "Swiss Voile",
  "African Wax Prints",
  "Giza Cotton Shirting",
  "Zürique Swiss Men Lace",
];

const USAGE_OPTIONS = [
  "Distributor",
  "Wholesaler",
  "Retailer",
  "Fashion House / Tailor",
];

const popupDetailsSchema = enquirySchema.pick({ fullName: true, whatsappNumber: true }).extend({
  whatsappNumber: enquirySchema.shape.whatsappNumber.refine(
    (phone) => phone.replace(/\D/g, "").length >= 5,
    "Please enter at least 5 digits for your WhatsApp number.",
  ),
});

type FieldErrors = { fullName?: string; whatsappNumber?: string };

export function WhatsAppModal({
  fabrics = DEFAULT_FABRICS,
}: {
  fabrics?: string[];
}) {
  const pathname = usePathname();
  const { isOpen, close: closeModal } = useWhatsAppPopup();
  const panelRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();

  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>([]);
  const [selectedUsage, setSelectedUsage] = useState<string[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});

  const close = useCallback(
    (reason: "dismiss" | "success") => {
      closeModal();
      if (reason === "dismiss") track("popup_dismiss", { path: pathname, modal: "whatsapp_form" });
    },
    [closeModal, pathname],
  );

  useFocusTrap(panelRef, isOpen, () => close("dismiss"));

  const toggleFabric = (fabric: string) => {
    setSelectedFabrics((prev) =>
      prev.includes(fabric) ? prev.filter((f) => f !== fabric) : [...prev, fabric],
    );
  };

  const toggleUsage = (usage: string) => {
    setSelectedUsage((prev) =>
      prev.includes(usage) ? prev.filter((u) => u !== usage) : [...prev, usage],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = popupDetailsSchema.safeParse({ fullName, whatsappNumber });
    if (!result.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field === "fullName" || field === "whatsappNumber") {
          nextErrors[field] ??= issue.message;
        }
      }
      if (fullName.trim().length < 2) {
        nextErrors.fullName = "Please enter a name with at least 2 characters.";
      }
      setErrors(nextErrors);
      (nextErrors.fullName ? nameRef : numberRef).current?.focus();
      return;
    }

    setErrors({});

    const countryObj = COUNTRY_CODES.find((c) => c.value === countryCode);
    const countryName = countryObj
      ? countryObj.label.replace(/\s*\(\+?\d+\)$/, "").trim()
      : "my country";
    const fabricsText = selectedFabrics.length > 0 ? selectedFabrics.join(", ") : "luxury fabrics";
    const usageText = selectedUsage.length > 0 ? selectedUsage.join(", ") : "trade";

    // Client format: Hi Nabeen, I am *Name* from *country*, I am looking for *Fabrics of interest* for *usage* purposes.
    const message = `Hi Nabeen, I am ${fullName.trim()} from ${countryName}, I am looking for ${fabricsText} for ${usageText} purposes.`;
    const whatsappUrl = `https://wa.me/919819693626?text=${encodeURIComponent(message)}`;

    // Open WhatsApp in a new tab
    window.open(whatsappUrl, "_blank");

    // Save lead in background
    const formData = new FormData();
    formData.set("fullName", fullName.trim());
    formData.set("countryCode", countryCode);
    formData.set("whatsappNumber", whatsappNumber.trim());
    selectedFabrics.forEach((f) => formData.append("fabrics", f));
    selectedUsage.forEach((u) => formData.append("usage", u));
    formData.set("message", message);
    formData.set("variant", "short");

    submitEnquiry(IDLE, formData).catch(() => {});
    track("whatsapp_click", { location: "whatsapp_form_modal" });

    close("success");
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <motion.div
            aria-hidden="true"
            onClick={() => close("dismiss")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.24 }}
            className="absolute inset-0 bg-navy-deep/60 backdrop-blur-[2px]"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="whatsapp-modal-title"
            tabIndex={-1}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-[28rem] overflow-y-auto overscroll-contain rounded-2xl bg-white p-5 shadow-[var(--shadow-float)] sm:max-h-[92dvh] sm:p-7"
          >
            <button
              type="button"
              onClick={() => close("dismiss")}
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-slate transition-colors hover:bg-mist hover:text-navy"
            >
              <span className="visually-hidden">Close</span>
              <X aria-hidden="true" size={20} strokeWidth={1.5} />
            </button>

            <div className="text-center">
              <Image
                src="/images/logos/nabeen-logo-navy.png"
                alt="Nabeen, luxury fabrics by DJI"
                width={1088}
                height={345}
                priority
                className="mx-auto h-7 w-auto"
              />
              <h2 id="whatsapp-modal-title" className="mt-3.5 text-xl font-bold text-navy sm:text-2xl">
                Enquire on WhatsApp
              </h2>
            </div>

            <form noValidate onSubmit={handleSubmit} className="mt-4 grid min-w-0 grid-cols-1 gap-3.5 [&>div]:min-w-0">
              <div>
                <label htmlFor="modal-name" className="block text-xs font-semibold text-navy">
                  Full Name <span className="text-accent">*</span>
                </label>
                <input
                  ref={nameRef}
                  id="modal-name"
                  name="fullName"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  aria-invalid={errors.fullName ? true : undefined}
                  aria-describedby={errors.fullName ? "modal-name-error" : undefined}
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setErrors((current) => ({ ...current, fullName: undefined }));
                  }}
                  className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none transition focus:border-navy focus:ring-1 focus:ring-navy"
                />
                {errors.fullName ? (
                  <p id="modal-name-error" role="alert" className="mt-1.5 text-xs text-red-600">
                    {errors.fullName}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="modal-number" className="block text-xs font-semibold text-navy">
                  WhatsApp Number <span className="text-accent">*</span>
                </label>
                <div className="mt-1.5 flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-32 max-w-[130px] shrink-0 rounded-lg border border-line bg-white px-2.5 py-2.5 text-xs outline-none transition focus:border-navy focus:ring-1 focus:ring-navy"
                    aria-label="Country Calling Code"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={`${c.value}-${c.label}`} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    ref={numberRef}
                    id="modal-number"
                    name="whatsappNumber"
                    type="tel"
                    required
                    minLength={5}
                    maxLength={20}
                    inputMode="tel"
                    autoComplete="tel-national"
                    aria-invalid={errors.whatsappNumber ? true : undefined}
                    aria-describedby={errors.whatsappNumber ? "modal-number-error" : undefined}
                    placeholder="Mobile number"
                    value={whatsappNumber}
                    onChange={(e) => {
                      setWhatsappNumber(e.target.value);
                      setErrors((current) => ({ ...current, whatsappNumber: undefined }));
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none transition focus:border-navy focus:ring-1 focus:ring-navy"
                  />
                </div>
                {errors.whatsappNumber ? (
                  <p id="modal-number-error" role="alert" className="mt-1.5 text-xs text-red-600">
                    {errors.whatsappNumber}
                  </p>
                ) : null}
              </div>

              <div>
                <span className="block text-xs font-semibold text-navy">
                  Fabrics of Interest <span className="text-slate font-normal">(Optional)</span>
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {fabrics.map((fabric) => {
                    const active = selectedFabrics.includes(fabric);
                    return (
                      <button
                        key={fabric}
                        type="button"
                        onClick={() => toggleFabric(fabric)}
                        className={`min-h-11 rounded-md border px-2.5 py-1 text-xs transition-all lg:min-h-0 ${
                          active
                            ? "border-navy bg-navy text-white"
                            : "border-line bg-white text-slate hover:border-slate/60 hover:text-navy"
                        }`}
                      >
                        {fabric}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-navy">
                  Usage <span className="text-slate font-normal">(Optional)</span>
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {USAGE_OPTIONS.map((usage) => {
                    const active = selectedUsage.includes(usage);
                    return (
                      <button
                        key={usage}
                        type="button"
                        onClick={() => toggleUsage(usage)}
                        className={`min-h-11 rounded-md border px-2.5 py-1 text-xs transition-all lg:min-h-0 ${
                          active
                            ? "border-navy bg-navy text-white"
                            : "border-line bg-white text-slate hover:border-slate/60 hover:text-navy"
                        }`}
                      >
                        {usage}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-whatsapp)] py-3 text-sm font-bold tracking-wide text-[var(--color-whatsapp-ink)] shadow-md transition hover:opacity-95 active:scale-[0.99]"
              >
                <WhatsAppGlyph size={18} />
                <span>START WHATSAPP CHAT</span>
              </button>
            </form>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

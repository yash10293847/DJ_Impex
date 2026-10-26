"use client";

import { startTransition, useActionState, useEffect, useId, useState } from "react";

import { submitEnquiry } from "@/app/actions/enquiry";
import { WhatsAppGlyph } from "@/components/ui/WhatsAppGlyph";
import { track } from "@/lib/analytics";
import { COUNTRY_CODES, IDLE, type EnquiryState } from "@/lib/enquiry";

export type FabricChoice = { slug: string; name: string };

const USAGE_OPTIONS = [
  "Distributor",
  "Wholesaler",
  "Retailer",
  "Fashion House / Tailor",
] as const;

/**
 * One form, two shapes: the full version on /contact, and a short version
 * (name and WhatsApp number) inside the contact pop-up.
 *
 * `paired` is a third dimension rather than a third shape: the same full form
 * with its text fields set two to a row. It exists for the home page, where the
 * form sits beside a column of words and a single file of fourteen fields towers
 * over them. Same fields, same order of thought, about 200px shorter.
 *
 * Four states: idle, submitting, success and error. An error always says what
 * failed and offers WhatsApp, because a lost enquiry is the one failure that costs
 * the client money.
 */
export function EnquiryForm(props: EnquiryFormProps) {
  const [attempt, setAttempt] = useState(0);

  return (
    <EnquiryFormContent
      key={attempt}
      {...props}
      focusOnMount={attempt > 0}
      onReset={() => setAttempt((current) => current + 1)}
    />
  );
}

type EnquiryFormProps = {
  variant?: "full" | "short";
  /** Set the text fields two to a row. Full variant only; ignored by the pop-up. */
  paired?: boolean;
  fabrics?: FabricChoice[];
  whatsappHref: string;
  onSuccess?: () => void;
  className?: string;
};

function EnquiryFormContent({
  variant = "full",
  paired = false,
  fabrics = [],
  whatsappHref,
  onSuccess,
  className = "",
  focusOnMount,
  onReset,
}: EnquiryFormProps & {
  focusOnMount: boolean;
  onReset: () => void;
}) {
  const [state, action, pending] = useActionState<EnquiryState, FormData>(submitEnquiry, IDLE);
  const id = useId();
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedUsage, setSelectedUsage] = useState<string[]>([]);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (state.status !== "success") return;
    track("enquiry_submit", { variant });
    try {
      sessionStorage.setItem("nabeen-enquiry-sent", "1");
    } catch {
      /* Private browsing: the popup will simply appear again next session. */
    }
    onSuccess?.();
  }, [state, variant, onSuccess]);

  const fieldError = (name: string) => clientErrors[name] || (state.status === "error" ? state.fieldErrors?.[name] : undefined);

  const handleInputChange = (fieldName: string) => {
    if (clientErrors[fieldName]) {
      setClientErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  // The full form set two fields to a row. The pop-up's short variant is already
  // short and stays in a single file.
  const twoUp = paired && variant === "full";

  const handleWhatsAppSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (pending) return;
    const formElement = e.currentTarget.closest("form");
    if (!formElement) return;

    const formData = new FormData(formElement);
    const name = formData.get("fullName")?.toString().trim() || "";
    const code = formData.get("countryCode")?.toString().trim() || "+91";
    const phone = formData.get("whatsappNumber")?.toString().trim() || "";
    const emailVal = formData.get("email")?.toString().trim() || "";
    const msg = formData.get("message")?.toString().trim() || "";

    const errors: Record<string, string> = {};

    if (!name || name.length < 2) {
      errors.fullName = "Please tell us your name.";
    }

    if (!phone || phone.length < 5) {
      errors.whatsappNumber = "Please add your WhatsApp number.";
    } else if (!/^[0-9\s()-]{5,20}$/.test(phone)) {
      errors.whatsappNumber = "Please use digits only for your WhatsApp number.";
    }

    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      errors.email = "Please check this email address.";
    }

    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      const firstErrorKey = Object.keys(errors)[0];
      const inputEl = formElement.querySelector<HTMLElement>(`[name="${firstErrorKey}"]`);
      inputEl?.focus();
      return;
    }

    setClientErrors({});

    const lines: string[] = ["Hi, I'm interested in Nabeen.", ""];
    lines.push(`Name: ${name}`);
    lines.push(`WhatsApp: ${code} ${phone}`);
    if (emailVal) lines.push(`Email: ${emailVal}`);
    if (selected.length > 0) lines.push(`Fabrics: ${selected.join(", ")}`);
    if (selectedUsage.length > 0) lines.push(`Usage: ${selectedUsage.join(", ")}`);
    if (msg) lines.push(`Message: ${msg}`);

    const prefill = lines.join("\n");

    track("whatsapp_click", { location: "enquiry_form_whatsapp_btn" });
    const baseUrl = whatsappHref ? whatsappHref.split("?")[0] : "https://wa.me/919819693626";
    window.open(`${baseUrl}?text=${encodeURIComponent(prefill)}`, "_blank", "noopener,noreferrer");

    // Automatically trigger SMTP email send in background
    const submitData = new FormData();
    submitData.set("fullName", name);
    submitData.set("countryCode", code);
    submitData.set("whatsappNumber", phone);
    if (emailVal) submitData.set("email", emailVal);
    selected.forEach((f) => submitData.append("fabrics", f));
    selectedUsage.forEach((u) => submitData.append("usage", u));
    submitData.set("message", msg);
    submitData.set("variant", variant);

    // Keep the server action attached to React's pending/result state, even
    // while WhatsApp is open in another tab. Never discard returned errors.
    startTransition(() => action(submitData));
  };

  const fullName = (
    <Field
      key="fullName"
      id={`${id}-fullName`}
      name="fullName"
      label="Full name"
      required
      autoComplete="name"
      autoFocus={focusOnMount}
      error={fieldError("fullName")}
      onChange={() => handleInputChange("fullName")}
    />
  );

  const whatsappNumber = (
    <div className="grid gap-2">
      <label htmlFor={`${id}-whatsappNumber`} className="t-small font-semibold">
        WhatsApp number<span className="visually-hidden"> (required)</span>
      </label>
      <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
        <select
          id={`${id}-countryCode`}
          name="countryCode"
          required
          defaultValue="+91"
          aria-label="Country code"
          aria-invalid={fieldError("countryCode") ? true : undefined}
          aria-describedby={fieldError("countryCode") ? `${id}-countryCode-error` : undefined}
          className={`${CONTROL} ${fieldError("countryCode") ? "border-[var(--color-error)]" : ""}`.trim()}
        >
          {COUNTRY_CODES.map((country, index) => (
            <option key={`${country.label}-${index}`} value={country.value}>
              {country.label}
            </option>
          ))}
        </select>
        <input
          id={`${id}-whatsappNumber`}
          name="whatsappNumber"
          type="tel"
          required
          placeholder="WhatsApp number"
          autoComplete="tel-national"
          onChange={() => handleInputChange("whatsappNumber")}
          aria-invalid={fieldError("whatsappNumber") ? true : undefined}
          aria-describedby={fieldError("whatsappNumber") ? `${id}-whatsappNumber-error` : undefined}
          className={`${CONTROL} ${fieldError("whatsappNumber") ? "border-[var(--color-error)]" : ""}`.trim()}
        />
      </div>
      {fieldError("countryCode") ? (
        <p id={`${id}-countryCode-error`} className="t-small text-[var(--color-error)]">
          {fieldError("countryCode")}
        </p>
      ) : null}
      {fieldError("whatsappNumber") ? (
        <p id={`${id}-whatsappNumber-error`} className="t-small text-[var(--color-error)]">
          {fieldError("whatsappNumber")}
        </p>
      ) : null}
    </div>
  );

  const email =
    variant === "full" ? (
      <Field
        key="email"
        id={`${id}-email`}
        name="email"
        label="Email (optional)"
        type="email"
        autoComplete="email"
        error={fieldError("email")}
        onChange={() => handleInputChange("email")}
      />
    ) : null;

  if (state.status === "success") {
    return (
      <div className={`border-accent border-l pl-6 ${className}`.trim()} role="status">
        {/* "Received" rather than "sent": the enquiry is always stored, and the
            email may not have gone out. The action's own message carries the
            detail; this heading must not contradict it. */}
        <p className="t-h3">Enquiry received</p>
        <p className="text-slate mt-3 max-w-[34rem]">{state.message}</p>
        <button type="button" onClick={onReset} className="btn btn-primary mt-6">
          Submit another enquiry
        </button>
      </div>
    );
  }

  return (
    <form action={action} className={`enquiry-form grid min-w-0 ${twoUp ? "gap-4" : "gap-5"} ${className}`.trim()} noValidate>
      <input type="hidden" name="variant" value={variant} />

      {/* Honeypot: hidden from people, irresistible to bots. */}
      <div className="visually-hidden" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Leave this field empty</label>
        <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {twoUp ? (
        /* Who you are, how to reach you, where you are: three rows instead of
           six, and each row is still one thought. */
        <>
          {fullName}
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            {whatsappNumber}
            {email}
          </div>
        </>
      ) : (
        <>
          {fullName}
          {whatsappNumber}
          {email}
        </>
      )}

      {variant === "full" ? (
        <>
          {fabrics.length > 0 ? (
            <fieldset className="grid gap-3">
              <legend className="t-small font-semibold">Fabrics of interest</legend>
              <div className="flex flex-wrap gap-2">
                {fabrics.map((fabric) => {
                  const checked = selected.includes(fabric.name);
                  return (
                    <label
                      key={fabric.slug}
                      className={`t-small cursor-pointer border px-4 py-2 transition-colors duration-[var(--duration-quick)] ${
                        checked
                          ? "border-navy bg-navy text-white"
                          : "border-line text-slate hover:border-navy hover:text-navy"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="fabrics"
                        value={fabric.name}
                        checked={checked}
                        onChange={(event) =>
                          setSelected((current) =>
                            event.target.checked
                              ? [...current, fabric.name]
                              : current.filter((item) => item !== fabric.name),
                          )
                        }
                        className="visually-hidden"
                      />
                      {fabric.name}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          <fieldset className="grid gap-3">
            <legend className="t-small font-semibold">Usage</legend>
            <div className="flex flex-wrap gap-2">
              {USAGE_OPTIONS.map((option) => {
                const checked = selectedUsage.includes(option);
                return (
                  <label
                    key={option}
                    className={`t-small cursor-pointer border px-4 py-2 transition-colors duration-[var(--duration-quick)] ${
                      checked
                        ? "border-navy bg-navy text-white"
                        : "border-line text-slate hover:border-navy hover:text-navy"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="usage"
                      value={option}
                      checked={checked}
                      onChange={(event) =>
                        setSelectedUsage((current) =>
                          event.target.checked
                            ? [...current, option]
                            : current.filter((item) => item !== option),
                        )
                      }
                      className="visually-hidden"
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-2">
            <label htmlFor={`${id}-message`} className="t-small font-semibold">
              Message
            </label>
            <textarea
              id={`${id}-message`}
              name="message"
              rows={twoUp ? 3 : 4}
              className="border-line text-navy w-full resize-none rounded-[var(--radius-control)] border bg-white px-3.5 py-3"
            />
          </div>
        </>
      ) : null}

      {state.status === "error" && !state.fieldErrors ? (
        <p role="alert" className="t-small text-[var(--color-error)]">
          {state.message}
        </p>
      ) : null}

      <div aria-live="polite" className="visually-hidden">
        {state.status === "error" ? state.message : ""}
      </div>

      <div className="mt-1 grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleWhatsAppSubmit}
            disabled={pending}
            aria-busy={pending}
            className={`btn border-0 bg-[#25D366] text-white hover:bg-[#20ba5a] active:bg-[#1caa52] justify-center gap-2 font-medium shadow-sm transition-colors duration-150 ${variant === "short" ? "" : "sm:w-fit"}`}
          >
            <WhatsAppGlyph size={18} />
            <span>{pending ? "Saving your enquiry…" : "Send enquiry via WhatsApp"}</span>
          </button>
        </div>

        {state.status === "error" ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("whatsapp_click", { location: "form_fallback" })}
            className="text-link flex w-fit items-center gap-2"
          >
            <WhatsAppGlyph size={18} />
            <span>Chat with us on WhatsApp instead</span>
          </a>
        ) : null}

        <p className="t-small text-slate">We&rsquo;ll only use these details to reply to your enquiry.</p>
      </div>
    </form>
  );
}

const CONTROL =
  "h-[2.875rem] w-full border border-line bg-white px-3.5 text-navy rounded-[var(--radius-control)]";

function Field({
  id,
  name,
  label,
  error,
  required,
  type = "text",
  onChange,
  ...rest
}: {
  id: string;
  name: string;
  label: string;
  error?: string;
  required?: boolean;
  type?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="t-small font-semibold">
        {label}
        {required ? <span className="visually-hidden"> (required)</span> : null}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        onChange={onChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${CONTROL} ${error ? "border-[var(--color-error)]" : ""}`.trim()}
        {...rest}
      />
      {error ? (
        <p id={`${id}-error`} className="t-small text-[var(--color-error)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

import "server-only";

import type { Enquiry } from "@/lib/enquiry";

import type { AdminEnquiry } from "./schemas";
import { mutate, newId, nowIso } from "./store";
import { securityEvent } from "@/lib/security/errors";

/** Keep the file from growing without bound on a long-lived server. */
const MAX_ROWS = 5000;

/**
 * Append a website enquiry to the panel's store, and say whether it landed.
 *
 * It must never be the reason a customer sees a failure, so every error is
 * swallowed and logged. The return value matters though: if the enquiry is
 * safely stored, a failed email is no longer a lost lead, and the caller can
 * tell the customer the truth rather than turning them away.
 */
export async function recordEnquiry(enquiry: Enquiry): Promise<boolean> {
  const details = [
    `WhatsApp: ${enquiry.countryCode} ${enquiry.whatsappNumber}`,
    enquiry.fabrics.length ? `Fabrics of interest: ${enquiry.fabrics.join(", ")}` : null,
    enquiry.usage.length ? `Usage: ${enquiry.usage.join(", ")}` : null,
    enquiry.message ? `\n${enquiry.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const row: AdminEnquiry = {
    id: newId(),
    name: enquiry.fullName.slice(0, 120),
    email: enquiry.email.slice(0, 160),
    subject: enquiry.variant === "short" ? "Enquiry from the contact pop-up" : "Enquiry from the home page",
    message: details.slice(0, 4000),
    date: nowIso(),
    status: "unread",
  };

  try {
    await mutate("enquiries", (rows) => {
      if (rows.length >= MAX_ROWS) throw new Error("Inbox capacity reached.");
      return { rows: [row, ...rows], result: null };
    });
    return true;
  } catch {
    securityEvent("enquiry_record_failed");
    return false;
  }
}

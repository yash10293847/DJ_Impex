import "server-only";

import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { z } from "zod";
import type { Enquiry } from "@/lib/enquiry";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function escapedEnquiry(input: Enquiry): Enquiry {
  return { ...input, fullName: escapeHtml(input.fullName), email: escapeHtml(input.email),
    fabrics: input.fabrics.map(escapeHtml), message: escapeHtml(input.message) };
}

export function smtpConfiguration(): { transport: SMTPTransport.Options; from: string; to: string } {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER || "";
  // Password bytes are significant. Do not strip whitespace or quotes from secrets.
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS || "";
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || "465");
  const from = z.email().parse(process.env.SMTP_FROM_EMAIL || user);
  const to = z.email().parse(process.env.CONTACT_RECEIVER_EMAIL || process.env.ENQUIRY_TO_EMAIL || "admin@djimpex.in");
  if (!user || !pass || /[\r\n\0]/.test(user) || !/^[a-z0-9.-]+$/i.test(host) || ![465, 587, 2525].includes(port)) throw new Error("Invalid SMTP configuration.");
  return {
    from, to,
    transport: { host, port, secure: port === 465, requireTLS: port !== 465,
      tls: { minVersion: "TLSv1.2", rejectUnauthorized: true }, auth: { user, pass },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
      disableFileAccess: true, disableUrlAccess: true },
  };
}

import "server-only";
import { smtpConfiguration } from "@/lib/security/mail";

export type Check = { label: string; ok: boolean; detail: string };

/** Render status only; no account, secret length, recipient, or provider detail. */
export function mailChecks(): Check[] {
  const ok = mailWorking();
  return [{ label: "Email delivery", ok, detail: ok ? "configured" : "configuration required" }];
}

export function mailWorking(): boolean {
  try { smtpConfiguration(); return process.env.CONTACT_EMAIL_ENABLED !== "false"; }
  catch { return false; }
}

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SecurityError, securityEvent } from "@/lib/security/errors";
import { assertSameOrigin, clientIdentifier } from "@/lib/security/request";
import { consumeLimits } from "@/lib/security/rate-limit";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { configuredAdminEmail, normalizeAdminEmail } from "@/lib/security/identity";
import {
  createSession,
  currentSession,
  finishMfaChallenge,
  readAuth,
  replacePassword,
  requireAdmin,
  revokeSession,
  startMfaChallenge,
} from "@/lib/security/session";

export type AuthState = { error?: string; success?: boolean; needsMfa?: boolean };
type AuthStage =
  | "unknown"
  | "origin"
  | "client_identifier"
  | "rate_limit"
  | "admin_identity"
  | "auth_document"
  | "password_verification"
  | "session_creation"
  | "mfa_verification";

function safeFailure(error: unknown, stage: AuthStage = "unknown"): AuthState {
  if (error instanceof SecurityError && error.status < 500) return { error: error.message };
  // Only fixed stage labels reach logs; never log errors or configuration values.
  securityEvent(`admin_auth_unavailable_${stage}`);
  return { error: "Administrator access is temporarily unavailable. Please try again later." };
}

async function checkAttempt(
  purpose: "login" | "password" | "mfa",
  setStage: (stage: AuthStage) => void = () => {},
): Promise<void> {
  const requestHeaders = await headers();
  setStage("origin");
  assertSameOrigin(requestHeaders);
  setStage("client_identifier");
  const client = clientIdentifier(requestHeaders);
  setStage("rate_limit");
  await consumeLimits("auth", [
    { key: `${purpose}:ip:${client}`, limit: 5, windowMs: 15 * 60 * 1000 },
    { key: `${purpose}:global`, limit: 60, windowMs: 15 * 60 * 1000 },
  ]);
}

export async function loginAdminAction(_previous: AuthState | null, formData: FormData): Promise<AuthState> {
  let stage: AuthStage = "unknown";
  const verifyingMfa = formData.get("step") === "mfa";
  try {
    // Enforced inside the action, regardless of the pathname used to invoke it.
    await checkAttempt(verifyingMfa ? "mfa" : "login", (value) => {
      stage = value;
    });
    if (verifyingMfa) {
      stage = "mfa_verification";
      await finishMfaChallenge(String(formData.get("code") ?? ""));
    } else {
      stage = "admin_identity";
      const expectedEmail = configuredAdminEmail();
      const email = normalizeAdminEmail(formData.get("email"));
      const password = String(formData.get("password") ?? "");
      stage = "auth_document";
      const auth = await readAuth();
      // Verify the password even for a different email so validly formatted
      // account guesses do not skip the expensive verification step.
      stage = "password_verification";
      const passwordValid = await verifyPassword(password, auth.passwordHash);
      if (email !== expectedEmail || !passwordValid)
        return { error: "Invalid email or password. Please try again." };
      stage = "session_creation";
      if (auth.mfa) {
        await startMfaChallenge(auth.passwordHash, formData.get("remember") === "on");
        return { needsMfa: true };
      }
      await createSession(auth.passwordHash, formData.get("remember") === "on");
    }
  } catch (error) {
    return {
      ...safeFailure(error, stage),
      needsMfa: verifyingMfa && !(error instanceof SecurityError && error.status === 401),
    };
  }
  redirect("/admin/images");
}

export async function changeAdminPasswordAction(
  _previous: AuthState | null,
  formData: FormData,
): Promise<AuthState> {
  try {
    assertSameOrigin(await headers());
    const session = await requireAdmin();
    await checkAttempt("password");
    const oldPassword = String(formData.get("oldPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmation = String(formData.get("confirmPassword") ?? "");
    if (newPassword.length < 12 || newPassword.length > 256)
      return { error: "Use a new password between 12 and 256 characters." };
    if (newPassword !== confirmation) return { error: "New password and confirmation do not match." };
    const auth = await readAuth();
    if (!(await verifyPassword(oldPassword, auth.passwordHash)))
      return { error: "Current password is incorrect." };
    const newHash = await hashPassword(newPassword);
    await replacePassword(
      auth.passwordHash,
      newHash,
      session.tokenHash,
      String(formData.get("mfaCode") ?? ""),
    );
  } catch (error) {
    return safeFailure(error);
  }
  redirect("/admin/images");
}

export async function logoutAdminAction(): Promise<void> {
  assertSameOrigin(await headers());
  await requireAdmin();
  // Do not claim successful logout if the persistent revocation failed.
  await revokeSession();
  redirect("/admin/login");
}

export async function checkAdminSession(): Promise<boolean> {
  return Boolean(await currentSession());
}

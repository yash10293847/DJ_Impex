"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SecurityError, securityEvent } from "@/lib/security/errors";
import { assertSameOrigin, clientIdentifier } from "@/lib/security/request";
import { consumeLimits } from "@/lib/security/rate-limit";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { createSession, currentSession, readAuth, replacePassword, requireAdmin, revokeSession } from "@/lib/security/session";

export type AuthState = { error?: string; success?: boolean };

function safeFailure(error: unknown): AuthState {
  if (error instanceof SecurityError && error.status < 500) return { error: error.message };
  securityEvent("admin_auth_unavailable");
  return { error: "Administrator access is temporarily unavailable. Please try again later." };
}

async function checkAttempt(purpose: "login" | "password"): Promise<void> {
  const requestHeaders = await headers();
  assertSameOrigin(requestHeaders);
  const client = clientIdentifier(requestHeaders);
  await consumeLimits("auth", [
    { key: `${purpose}:ip:${client}`, limit: 5, windowMs: 15 * 60 * 1000 },
    { key: `${purpose}:global`, limit: 60, windowMs: 15 * 60 * 1000 },
  ]);
}

export async function loginAdminAction(_previous: AuthState | null, formData: FormData): Promise<AuthState> {
  try {
    // Enforced inside the action, regardless of the pathname used to invoke it.
    await checkAttempt("login");
    const password = String(formData.get("password") ?? "");
    const auth = await readAuth();
    if (!(await verifyPassword(password, auth.passwordHash))) return { error: "Invalid password. Please try again." };
    await createSession(auth.passwordHash, formData.get("remember") === "on");
  } catch (error) { return safeFailure(error); }
  redirect("/admin/images");
}

export async function changeAdminPasswordAction(_previous: AuthState | null, formData: FormData): Promise<AuthState> {
  try {
    assertSameOrigin(await headers());
    const session = await requireAdmin();
    await checkAttempt("password");
    const oldPassword = String(formData.get("oldPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmation = String(formData.get("confirmPassword") ?? "");
    if (newPassword.length < 12 || newPassword.length > 256) return { error: "Use a new password between 12 and 256 characters." };
    if (newPassword !== confirmation) return { error: "New password and confirmation do not match." };
    const auth = await readAuth();
    if (!(await verifyPassword(oldPassword, auth.passwordHash))) return { error: "Current password is incorrect." };
    const newHash = await hashPassword(newPassword);
    await replacePassword(auth.passwordHash, newHash, session.tokenHash);
    // All old sessions are revoked atomically; this device receives a fresh one.
    await createSession(newHash, false);
    return { success: true };
  } catch (error) { return safeFailure(error); }
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

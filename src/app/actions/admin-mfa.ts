"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";

import { assertSameOrigin, clientIdentifier } from "@/lib/security/request";
import { consumeLimits } from "@/lib/security/rate-limit";
import { SecurityError, securityEvent } from "@/lib/security/errors";
import { verifyPassword } from "@/lib/security/password";
import { configuredAdminEmail } from "@/lib/security/identity";
import {
  authenticator,
  hashRecoveryCodes,
  newMfaSecret,
  newRecoveryCodes,
  openMfaSecret,
  sealMfaSecret,
  validTotpStep,
} from "@/lib/security/mfa-crypto";
import { updateSecurityDoc } from "@/lib/security/documents";
import {
  AUTH_KEY,
  consumeMfa,
  hasActiveSession,
  newSessionRecord,
  parseAuth,
  readAuth,
  requireAdmin,
  setSessionCookie,
} from "@/lib/security/session";

export type MfaSetupState = {
  error?: string;
  setup?: { qrCode: string; manualKey: string; recoveryCodes: string[]; expires: number };
};
export type MfaManageState = {
  error?: string;
  success?: string;
  enabled?: boolean;
  recoveryCodes?: string[];
};

function failure(error: unknown): { error: string } {
  if (error instanceof SecurityError)
    return {
      error:
        error.status < 500
          ? error.message
          : "Authenticator setup is unavailable. Please contact the site administrator.",
    };
  securityEvent("admin_mfa_management_unavailable");
  return { error: "Authenticator setup is unavailable. Please try again later." };
}

async function protectedAttempt() {
  const requestHeaders = await headers();
  assertSameOrigin(requestHeaders);
  const session = await requireAdmin();
  const client = clientIdentifier(requestHeaders);
  await consumeLimits("auth", [
    { key: `mfa-settings:ip:${client}`, limit: 10, windowMs: 15 * 60 * 1000 },
    { key: "mfa-settings:global", limit: 30, windowMs: 15 * 60 * 1000 },
  ]);
  return session;
}

export async function beginMfaEnrollmentAction(
  _previous: MfaSetupState,
  form: FormData,
): Promise<MfaSetupState> {
  try {
    const session = await protectedAttempt();
    const auth = await readAuth();
    if (auth.mfa)
      throw new SecurityError(
        400,
        "MFA is already enabled. Disable it before enrolling a replacement authenticator.",
      );
    if (!(await verifyPassword(String(form.get("password") ?? ""), auth.passwordHash)))
      throw new SecurityError(400, "Current password is incorrect.");
    const manualKey = newMfaSecret();
    const secret = sealMfaSecret(manualKey);
    const recoveryCodes = newRecoveryCodes();
    const expires = Date.now() + 10 * 60 * 1000;
    const qrCode = await QRCode.toDataURL(authenticator(manualKey, configuredAdminEmail()).toString(), {
      width: 256,
      margin: 4,
      errorCorrectionLevel: "M",
    });
    await updateSecurityDoc(AUTH_KEY, parseAuth, (current) => {
      if (
        current.mfa ||
        current.passwordHash !== auth.passwordHash ||
        !hasActiveSession(current, session.tokenHash)
      )
        throw new SecurityError(401, "Please sign in again.");
      return {
        value: {
          ...current,
          pendingMfa: {
            secret,
            recoveryHashes: hashRecoveryCodes(recoveryCodes),
            sessionHash: session.tokenHash,
            expires,
          },
        },
        result: undefined,
      };
    });
    return { setup: { qrCode, manualKey, recoveryCodes, expires } };
  } catch (error) {
    return failure(error);
  }
}

export async function confirmMfaEnrollmentAction(
  _previous: MfaManageState,
  form: FormData,
): Promise<MfaManageState> {
  try {
    const session = await protectedAttempt();
    if (form.get("savedRecoveryCodes") !== "on")
      throw new SecurityError(400, "Save your recovery codes and confirm before enabling MFA.");
    const code = String(form.get("code") ?? "").trim();
    const token = randomBytes(32).toString("hex");
    const version = randomBytes(32).toString("hex");
    await updateSecurityDoc(AUTH_KEY, parseAuth, (auth) => {
      const pending = auth.pendingMfa;
      if (
        auth.mfa ||
        !hasActiveSession(auth, session.tokenHash) ||
        !pending ||
        pending.sessionHash !== session.tokenHash ||
        pending.expires <= Date.now()
      ) {
        throw new SecurityError(400, "Setup expired or was replaced. Start authenticator setup again.");
      }
      const step = validTotpStep(openMfaSecret(pending.secret), code, -1);
      if (step === null)
        throw new SecurityError(
          400,
          "The code is incorrect or expired. Enter a fresh code from your authenticator.",
        );
      return {
        value: {
          passwordHash: auth.passwordHash,
          mfa: { version, secret: pending.secret, recoveryHashes: pending.recoveryHashes, lastStep: step },
          sessions: [newSessionRecord(token, false, version)],
          challenges: [],
        },
        result: undefined,
      };
    });
    await setSessionCookie(token, false);
    securityEvent("admin_mfa_enabled");
  } catch (error) {
    return failure(error);
  }
  // Complete the cookie transition before rendering a protected page again.
  redirect("/admin/security?mfa=enabled");
}

export async function manageMfaAction(_previous: MfaManageState, form: FormData): Promise<MfaManageState> {
  try {
    const session = await protectedAttempt();
    const operation = form.get("operation");
    if (operation !== "disable" && operation !== "recovery")
      throw new SecurityError(400, "Choose a valid security action.");
    const auth = await readAuth();
    if (!(await verifyPassword(String(form.get("password") ?? ""), auth.passwordHash)))
      throw new SecurityError(400, "Current password is incorrect.");
    const code = String(form.get("code") ?? "");
    const recoveryCodes = operation === "recovery" ? newRecoveryCodes() : undefined;
    const token = randomBytes(32).toString("hex");
    await updateSecurityDoc(AUTH_KEY, parseAuth, (current) => {
      if (current.passwordHash !== auth.passwordHash || !hasActiveSession(current, session.tokenHash))
        throw new SecurityError(401, "Please sign in again.");
      if (!current.mfa) throw new SecurityError(400, "MFA is not enabled.");
      const verified = consumeMfa(current.mfa, code);
      if (!verified)
        throw new SecurityError(400, "Enter a fresh authenticator code or an unused recovery code.");
      const mfa = recoveryCodes
        ? { ...verified, recoveryHashes: hashRecoveryCodes(recoveryCodes) }
        : undefined;
      return {
        value: {
          passwordHash: current.passwordHash,
          ...(mfa ? { mfa } : {}),
          sessions: recoveryCodes
            ? current.sessions.filter((entry) => entry.tokenHash === session.tokenHash)
            : [newSessionRecord(token, false)],
          challenges: [],
        },
        result: undefined,
      };
    });
    if (operation === "disable") await setSessionCookie(token, false);
    securityEvent(operation === "disable" ? "admin_mfa_disabled" : "admin_mfa_recovery_regenerated");
    if (recoveryCodes)
      return {
        enabled: true,
        recoveryCodes,
        success: "New recovery codes created. Your old recovery codes and other sessions no longer work.",
      };
  } catch (error) {
    return failure(error);
  }
  redirect("/admin/security?mfa=disabled");
}

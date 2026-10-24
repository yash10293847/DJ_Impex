import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { storage } from "@/lib/admin/storage";
import { updateSecurityDoc } from "./documents";
import { SecurityError, securityEvent } from "./errors";
import { PASSWORD_HASH_PATTERN } from "./password";
import { openMfaSecret, recoveryIndex, validTotpStep } from "./mfa-crypto";

export const AUTH_KEY = "security/admin.json";
const KEY = AUTH_KEY;
const hexHash = z.string().regex(/^[a-f0-9]{64}$/);
const encryptedSecret = z.string().regex(/^v1:[a-f0-9]{24}:[a-f0-9]{32}:[a-f0-9]{64}$/i);
const mfaSchema = z.object({
  version: hexHash,
  secret: encryptedSecret,
  recoveryHashes: z.array(hexHash).max(10),
  lastStep: z.number().int().min(-1),
});
const schema = z.object({
  passwordHash: z.string().regex(PASSWORD_HASH_PATTERN),
  sessions: z
    .array(z.object({ tokenHash: hexHash, expires: z.number().int(), mfaVersion: hexHash.optional() }))
    .max(20),
  mfa: mfaSchema.optional(),
  pendingMfa: z
    .object({
      secret: encryptedSecret,
      recoveryHashes: z.array(hexHash).length(10),
      sessionHash: hexHash,
      expires: z.number().int(),
    })
    .optional(),
  challenges: z
    .array(
      z.object({
        tokenHash: hexHash,
        passwordHash: z.string().regex(PASSWORD_HASH_PATTERN),
        mfaVersion: hexHash,
        expires: z.number().int(),
        attempts: z.number().int().min(0).max(5),
        remember: z.boolean(),
      }),
    )
    .max(20)
    .optional(),
});
export type AuthDocument = z.infer<typeof schema>;

export function sessionCookieName(): string {
  return process.env.NODE_ENV === "production" ? "__Host-dji_admin_session" : "dji_admin_session";
}

export function parseAuth(text: string | null): AuthDocument {
  if (text) return schema.parse(JSON.parse(text));
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!passwordHash || !PASSWORD_HASH_PATTERN.test(passwordHash)) {
    throw new SecurityError(503, "Administrator access has not been configured.");
  }
  // Bootstrap once in a separate private document; never use tracked auth.json
  // or fall back to the bootstrap credential after a stored password change.
  return { passwordHash, sessions: [] };
}

export async function readAuth(): Promise<AuthDocument> {
  let doc;
  try {
    doc = await storage().readDoc(KEY);
  } catch (error) {
    securityEvent("admin_auth_storage_read_failed");
    throw error;
  }
  try {
    return parseAuth(doc?.text ?? null);
  } catch (error) {
    securityEvent(doc?.text ? "admin_auth_stored_record_invalid" : "admin_auth_bootstrap_hash_invalid");
    throw error;
  }
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function currentSession(): Promise<{ tokenHash: string; expires: number } | null> {
  const token = (await cookies()).get(sessionCookieName())?.value;
  return verifySessionToken(token);
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<{ tokenHash: string; expires: number } | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const auth = await readAuth();
  const hash = tokenHash(token);
  return (
    auth.sessions.find(
      (session) =>
        session.tokenHash === hash &&
        session.expires > Date.now() &&
        (!auth.mfa || session.mfaVersion === auth.mfa.version),
    ) ?? null
  );
}

export async function requireAdmin(): Promise<{ tokenHash: string; expires: number }> {
  const session = await currentSession();
  if (!session) throw new SecurityError(401, "Please sign in to continue.");
  return session;
}

export async function requireAdminPage(): Promise<void> {
  if (!(await currentSession())) redirect("/admin/login");
}

export async function createSession(passwordHash: string, remember: boolean): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const maxAge = remember ? 30 * 86400 : 86400;
  const expires = Date.now() + maxAge * 1000;
  await updateSecurityDoc(KEY, parseAuth, (auth) => {
    if (auth.passwordHash !== passwordHash) throw new SecurityError(401, "Please sign in again.");
    if (auth.mfa) throw new SecurityError(401, "Authenticator verification is required.");
    return {
      value: {
        ...auth,
        sessions: [
          ...auth.sessions.filter((s) => s.expires > Date.now()).slice(-19),
          { tokenHash: tokenHash(token), expires },
        ],
      },
      result: undefined,
    };
  });
  (await cookies()).set(sessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function replacePassword(
  currentHash: string,
  newHash: string,
  activeTokenHash: string,
  mfaCode = "",
): Promise<void> {
  const token = randomBytes(32).toString("hex");
  await updateSecurityDoc(KEY, parseAuth, (auth) => {
    if (auth.passwordHash !== currentHash || !hasActiveSession(auth, activeTokenHash)) {
      throw new SecurityError(401, "Please sign in again.");
    }
    const mfa = auth.mfa ? consumeMfa(auth.mfa, mfaCode) : undefined;
    if (auth.mfa && !mfa)
      throw new SecurityError(400, "Enter a fresh authenticator code or an unused recovery code.");
    return {
      value: {
        passwordHash: newHash,
        ...(mfa ? { mfa } : {}),
        sessions: [newSessionRecord(token, false, mfa?.version)],
      },
      result: undefined,
    };
  });
  await setSessionCookie(token, false);
}

export function hasActiveSession(auth: AuthDocument, hash: string): boolean {
  return auth.sessions.some(
    (session) =>
      session.tokenHash === hash &&
      session.expires > Date.now() &&
      (!auth.mfa || session.mfaVersion === auth.mfa.version),
  );
}

export function newSessionRecord(token: string, remember: boolean, mfaVersion?: string) {
  return {
    tokenHash: tokenHash(token),
    expires: Date.now() + (remember ? 30 : 1) * 86400 * 1000,
    ...(mfaVersion ? { mfaVersion } : {}),
  };
}

export async function setSessionCookie(token: string, remember: boolean): Promise<void> {
  (await cookies()).set(sessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: (remember ? 30 : 1) * 86400,
  });
}

/** Must run inside the same compare-and-swap transaction as the protected operation. */
export function consumeMfa(mfa: NonNullable<AuthDocument["mfa"]>, code: string): typeof mfa | null {
  if (/^\d{6}$/.test(code.trim())) {
    const step = validTotpStep(openMfaSecret(mfa.secret), code.trim(), mfa.lastStep);
    return step === null ? null : { ...mfa, lastStep: step };
  }
  const index = recoveryIndex(code, mfa.recoveryHashes);
  if (index < 0) return null;
  return { ...mfa, recoveryHashes: mfa.recoveryHashes.filter((_, i) => i !== index) };
}

export function challengeCookieName(): string {
  return process.env.NODE_ENV === "production" ? "__Host-dji_admin_mfa" : "dji_admin_mfa";
}

export async function startMfaChallenge(passwordHash: string, remember: boolean): Promise<void> {
  const token = randomBytes(32).toString("hex");
  await updateSecurityDoc(KEY, parseAuth, (auth) => {
    if (auth.passwordHash !== passwordHash || !auth.mfa)
      throw new SecurityError(401, "Please sign in again.");
    const challenges = (auth.challenges ?? []).filter((c) => c.expires > Date.now()).slice(-19);
    return {
      value: {
        ...auth,
        challenges: [
          ...challenges,
          {
            tokenHash: tokenHash(token),
            passwordHash,
            mfaVersion: auth.mfa.version,
            expires: Date.now() + 5 * 60 * 1000,
            attempts: 0,
            remember,
          },
        ],
      },
      result: undefined,
    };
  });
  // The challenge token never authenticates admin APIs or pages.
  (await cookies()).set(challengeCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });
}

export async function finishMfaChallenge(code: string): Promise<void> {
  const jar = await cookies();
  const challengeToken = jar.get(challengeCookieName())?.value;
  if (!challengeToken || !/^[a-f0-9]{64}$/.test(challengeToken))
    throw new SecurityError(401, "Verification expired. Sign in again.");
  const token = randomBytes(32).toString("hex");
  const result = await updateSecurityDoc(KEY, parseAuth, (auth) => {
    const challenges = (auth.challenges ?? []).filter((c) => c.expires > Date.now());
    const challenge = challenges.find((c) => c.tokenHash === tokenHash(challengeToken));
    if (
      !challenge ||
      challenge.attempts >= 5 ||
      !auth.mfa ||
      challenge.mfaVersion !== auth.mfa.version ||
      challenge.passwordHash !== auth.passwordHash
    ) {
      throw new SecurityError(401, "Verification expired. Sign in again.");
    }
    const mfa = consumeMfa(auth.mfa, code);
    if (!mfa)
      return {
        value: {
          ...auth,
          challenges: challenges.map((c) => (c === challenge ? { ...c, attempts: c.attempts + 1 } : c)),
        },
        result: { valid: false, remember: false },
      };
    return {
      value: {
        ...auth,
        mfa,
        challenges: challenges.filter((c) => c !== challenge),
        sessions: [
          ...auth.sessions.filter((s) => s.expires > Date.now()).slice(-19),
          newSessionRecord(token, challenge.remember, mfa.version),
        ],
      },
      result: { valid: true, remember: challenge.remember },
    };
  });
  if (!result.valid)
    throw new SecurityError(400, "Invalid or already used code. Try a fresh code or a recovery code.");
  await setSessionCookie(token, result.remember);
  jar.delete(challengeCookieName());
}

export async function revokeSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    await updateSecurityDoc(KEY, parseAuth, (auth) => ({
      value: {
        ...auth,
        sessions: auth.sessions.filter((s) => s.tokenHash !== tokenHash(token) && s.expires > Date.now()),
      },
      result: undefined,
    }));
  }
  cookieStore.delete(sessionCookieName());
  cookieStore.delete("dji_admin_session");
}

import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { storage } from "@/lib/admin/storage";
import { updateSecurityDoc } from "./documents";
import { SecurityError } from "./errors";
import { PASSWORD_HASH_PATTERN } from "./password";

const KEY = "security/admin.json";
const schema = z.object({
  passwordHash: z.string().regex(PASSWORD_HASH_PATTERN),
  sessions: z.array(z.object({ tokenHash: z.string().regex(/^[a-f0-9]{64}$/), expires: z.number().int() })).max(20),
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
  const doc = await storage().readDoc(KEY);
  return parseAuth(doc?.text ?? null);
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function currentSession(): Promise<{ tokenHash: string; expires: number } | null> {
  const token = (await cookies()).get(sessionCookieName())?.value;
  return verifySessionToken(token);
}

export async function verifySessionToken(token: string | undefined): Promise<{ tokenHash: string; expires: number } | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const auth = await readAuth();
  const hash = tokenHash(token);
  return auth.sessions.find((session) => session.tokenHash === hash && session.expires > Date.now()) ?? null;
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
    return {
      value: { ...auth, sessions: [...auth.sessions.filter((s) => s.expires > Date.now()).slice(-19), { tokenHash: tokenHash(token), expires }] },
      result: undefined,
    };
  });
  (await cookies()).set(sessionCookieName(), token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge,
  });
}

export async function replacePassword(currentHash: string, newHash: string, activeTokenHash: string): Promise<void> {
  await updateSecurityDoc(KEY, parseAuth, (auth) => {
    if (auth.passwordHash !== currentHash || !auth.sessions.some((s) => s.tokenHash === activeTokenHash && s.expires > Date.now())) {
      throw new SecurityError(401, "Please sign in again.");
    }
    return { value: { passwordHash: newHash, sessions: [] }, result: undefined };
  });
}

export async function revokeSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    await updateSecurityDoc(KEY, parseAuth, (auth) => ({
      value: { ...auth, sessions: auth.sessions.filter((s) => s.tokenHash !== tokenHash(token) && s.expires > Date.now()) }, result: undefined,
    }));
  }
  cookieStore.delete(sessionCookieName());
  cookieStore.delete("dji_admin_session");
}

import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Secret, TOTP } from "otpauth";
import { SecurityError } from "./errors";

function encryptionKey(): Buffer {
  const key = process.env.MFA_ENCRYPTION_KEY;
  if (!key || !/^[a-f0-9]{64}$/i.test(key))
    throw new SecurityError(503, "Authenticator setup is unavailable. Contact the site administrator.");
  return Buffer.from(key, "hex");
}

export function sealMfaSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from("dji-admin-mfa:v1"));
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("hex"), cipher.getAuthTag().toString("hex"), ciphertext.toString("hex")].join(
    ":",
  );
}

export function openMfaSecret(sealed: string): string {
  if (!/^v1:[a-f0-9]{24}:[a-f0-9]{32}:[a-f0-9]{64}$/i.test(sealed))
    throw new SecurityError(503, "Authenticator configuration is unavailable.");
  const [, iv, tag, ciphertext] = sealed.split(":");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "hex"));
  decipher.setAAD(Buffer.from("dji-admin-mfa:v1"));
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "hex")), decipher.final()]).toString("utf8");
}

export function authenticator(secret: string, label = "Administrator"): TOTP {
  return new TOTP({
    issuer: "D J Impex",
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
}

export function newMfaSecret(): string {
  return new Secret({ size: 20 }).base32;
}

export function validTotpStep(
  secret: string,
  code: string,
  lastStep: number,
  now = Date.now(),
): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const otp = authenticator(secret);
  const delta = otp.validate({ token: code, timestamp: now, window: 1 });
  if (delta === null) return null;
  const step = otp.counter({ timestamp: now }) + delta;
  return step > lastStep ? step : null;
}

export function recoveryHash(code: string): string {
  return createHash("sha256").update(`dji-mfa-recovery:v1:${code}`).digest("hex");
}

export function newRecoveryCodes(): string[] {
  return Array.from({ length: 10 }, () => randomBytes(16).toString("hex").match(/.{8}/g)!.join("-"));
}

export function recoveryIndex(code: string, hashes: string[]): number {
  const normalized = code.trim().toLowerCase().replaceAll("-", "");
  if (!/^[a-f0-9]{32}$/.test(normalized)) return -1;
  const candidate = Buffer.from(recoveryHash(normalized), "hex");
  return hashes.findIndex((hash) => timingSafeEqual(candidate, Buffer.from(hash, "hex")));
}

export function hashRecoveryCodes(codes: string[]): string[] {
  return codes.map((code) => recoveryHash(code.replaceAll("-", "")));
}

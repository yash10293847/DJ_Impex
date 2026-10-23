import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
export const PASSWORD_HASH_PATTERN = /^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{128}$/i;
const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, options, (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await derive(password, salt);
  return `scrypt-v1:${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (password.length < 1 || password.length > 256 || !PASSWORD_HASH_PATTERN.test(stored)) return false;
  const [, salt, hash] = stored.split(":");
  const derived = await derive(password, salt);
  return timingSafeEqual(Buffer.from(hash, "hex"), derived);
}

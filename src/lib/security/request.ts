import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { allowedOrigins, securitySecret } from "./config";
import { SecurityError } from "./errors";

export function assertSameOrigin(headers: Headers): void {
  const origin = headers.get("origin");
  const site = headers.get("sec-fetch-site");
  if (!origin || !allowedOrigins().has(origin) || (site && site !== "same-origin" && site !== "none")) {
    throw new SecurityError(403, "This request is not allowed.");
  }
}

export function privateIdentifier(value: string): string {
  return createHmac("sha256", securitySecret()).update(value).digest("hex");
}

export function clientIdentifier(headers: Headers): string {
  // Vercel overwrites x-vercel-forwarded-for at its edge. Never trust arbitrary
  // x-forwarded-for chains supplied by a caller. Local requests share one bucket.
  const raw = process.env.VERCEL ? headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() : "local";
  return privateIdentifier(raw && (raw === "local" || isIP(raw)) ? raw : "unknown");
}

export async function readLimitedBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
    throw new SecurityError(413, "The request is too large.");
  }
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new SecurityError(413, "The request is too large.");
      }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

export async function readJson(request: Request): Promise<unknown> {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") ?? "")) {
    throw new SecurityError(415, "Expected a JSON body.");
  }
  try {
    return JSON.parse(new TextDecoder().decode(await readLimitedBody(request, 256 * 1024)));
  } catch (error) {
    if (error instanceof SecurityError) throw error;
    throw new SecurityError(400, "Expected a JSON body.");
  }
}

export async function readMultipart(request: Request): Promise<FormData> {
  const type = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data;\s*boundary=/i.test(type)) {
    throw new SecurityError(415, "Expected a file upload.");
  }
  const bytes = await readLimitedBody(request, 4.25 * 1024 * 1024);
  try {
    return await new Response(Buffer.from(bytes), { headers: { "content-type": type } }).formData();
  } catch {
    throw new SecurityError(400, "Invalid upload.");
  }
}

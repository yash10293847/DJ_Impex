import "server-only";

import { SecurityError } from "./errors";

export function securitySecret(): string {
  const value = process.env.SECURITY_SECRET;
  if (!value || !/^[a-f0-9]{64,128}$/i.test(value)) {
    throw new SecurityError(503, "Security configuration is unavailable.");
  }
  return value;
}

export function allowedOrigins(): Set<string> {
  const origins = new Set<string>();
  const configured = process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
          (url.protocol !== "https:" && process.env.NODE_ENV === "production")) throw new Error();
      origins.add(url.origin);
    } catch {
      throw new SecurityError(503, "Security configuration is unavailable.");
    }
  }
  // These are set by Vercel, never taken from request Host/Forwarded headers.
  if (process.env.VERCEL && process.env.VERCEL_URL) origins.add(`https://${process.env.VERCEL_URL}`);
  if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3001");
    origins.add("http://127.0.0.1:3001");
  }
  if (!origins.size) throw new SecurityError(503, "Security configuration is unavailable.");
  return origins;
}

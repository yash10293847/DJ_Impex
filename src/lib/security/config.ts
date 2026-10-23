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
  // VERCEL_URL is the individual deployment address, not the stable production
  // alias. Both are platform configuration, never request Host/Forwarded input.
  if (process.env.VERCEL) {
    const domains = [process.env.VERCEL_URL];
    // This variable also exists in previews: do not trust production origins in
    // a preview just because Vercel exposes the production project's address.
    if (process.env.VERCEL_ENV === "production") domains.push(process.env.VERCEL_PROJECT_PRODUCTION_URL);
    for (const domain of domains) {
      if (!domain) continue;
      if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(domain)) {
        throw new SecurityError(503, "Security configuration is unavailable.");
      }
      origins.add(`https://${domain.toLowerCase()}`);
    }
  }
  if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3001");
    origins.add("http://127.0.0.1:3001");
  }
  if (!origins.size) throw new SecurityError(503, "Security configuration is unavailable.");
  return origins;
}

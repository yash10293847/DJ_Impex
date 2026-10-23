import "server-only";

import { z } from "zod";
import { updateSecurityDoc } from "./documents";
import { SecurityError } from "./errors";

const stateSchema = z.record(z.string(), z.object({ count: z.number().int().nonnegative(), expires: z.number() }));
export type RateRule = { key: string; limit: number; windowMs: number };
type Scope = "auth" | "contact" | "recipient" | "mutation";

export async function consumeLimits(scope: Scope, rules: RateRule[], now = Date.now()): Promise<void> {
  await updateSecurityDoc(`security/rate-${scope}.json`, (text) => stateSchema.parse(text ? JSON.parse(text) : {}), (state) => {
    const live = Object.fromEntries(Object.entries(state).filter(([, value]) => value.expires > now));
    for (const rule of rules) {
      const entry = live[rule.key];
      if (entry && entry.count >= rule.limit) {
        throw new SecurityError(429, "Too many requests. Please try again later.", Math.ceil((entry.expires - now) / 1000));
      }
    }
    // Fixed document names and bounded live entries prevent attacker-created blobs
    // and prevent cache eviction from resetting active limits.
    if (Object.keys(live).length + rules.filter((rule) => !live[rule.key]).length > 2048) {
      throw new SecurityError(429, "Too many requests. Please try again later.", 60);
    }
    for (const rule of rules) {
      const entry = live[rule.key];
      live[rule.key] = { count: (entry?.count ?? 0) + 1, expires: entry?.expires ?? now + rule.windowMs };
    }
    return { value: live, result: undefined };
  });
}

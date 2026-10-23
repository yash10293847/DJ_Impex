import "server-only";

import { z } from "zod";
import { SecurityError } from "./errors";

const emailSchema = z.email().max(254);

export function normalizeAdminEmail(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 254) return null;
  const result = emailSchema.safeParse(value.trim().toLowerCase());
  return result.success ? result.data : null;
}

export function configuredAdminEmail(): string {
  const email = normalizeAdminEmail(process.env.ADMIN_EMAIL);
  if (!email) throw new SecurityError(503, "Administrator access has not been configured.");
  return email;
}

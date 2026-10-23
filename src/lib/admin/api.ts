import { NextResponse } from "next/server";
import { z } from "zod";

import { StoreError } from "./store";
import { requireAdmin } from "@/lib/security/session";
import { assertSameOrigin, readJson } from "@/lib/security/request";
import { consumeLimits } from "@/lib/security/rate-limit";
import { SecurityError, securityEvent } from "@/lib/security/errors";

/** File-backed routes must never be cached or prerendered. */
export const dynamic = "force-dynamic";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function fail(message: string, status = 400, fieldErrors?: Record<string, string>) {
  return NextResponse.json({ error: message, fieldErrors }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function guardAdminRequest(request: Request): Promise<void> {
  const session = await requireAdmin();
  if (!["GET", "HEAD"].includes(request.method)) {
    assertSameOrigin(request.headers);
    await consumeLimits("mutation", [
      { key: session.tokenHash, limit: 120, windowMs: 10 * 60 * 1000 },
      { key: "global", limit: 500, windowMs: 60 * 60 * 1000 },
    ]);
  }
}

/**
 * One place that turns a thrown thing into a response.
 * A store failure carries its own status; anything else is a real bug, so it is
 * logged in full and reported without its internals.
 */
export function handleError(scope: string, error: unknown) {
  if (error instanceof SecurityError && error.status < 500) {
    const response = fail(error.message, error.status);
    if (error.retryAfter) response.headers.set("Retry-After", String(error.retryAfter));
    return response;
  }
  if (error instanceof StoreError && error.status === 409) return fail("This item changed. Please try again.", 409);
  if (error instanceof StoreError && error.status === 413) return fail("This collection has reached its storage limit.", 413);
  const id = securityEvent(`admin_${scope.replace(/[^a-z:]/gi, "")}_failed`);
  return fail(`The request could not be completed. Reference: ${id}`, error instanceof SecurityError ? error.status : 500);
}

/** Validate a JSON body, returning either the value or a 400 with field errors. */
export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T; response?: never } | { data?: never; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await readJson(request);
  } catch (error) {
    if (error instanceof SecurityError) return { response: handleError("body", error) };
    return { response: fail("Expected a JSON body.", 400) };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { response: fail("Please check the highlighted fields.", 400, fieldErrors) };
  }
  return { data: result.data };
}

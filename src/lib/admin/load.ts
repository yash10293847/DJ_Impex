import "server-only";

import { readCollection, type CollectionName } from "./store";
import { requireAdminPage } from "@/lib/security/session";
import { securityEvent } from "@/lib/security/errors";

/**
 * A page-friendly read: never throws, so the page can decide what to render
 * without wrapping JSX in a try/catch (which would not catch render errors
 * anyway, only the read).
 */
export async function loadCollection<N extends CollectionName>(
  name: N,
): Promise<
  { ok: true; rows: Awaited<ReturnType<typeof readCollection<N>>> } | { ok: false; message: string }
> {
  await requireAdminPage();
  try {
    return { ok: true, rows: await readCollection(name) };
  } catch {
    const id = securityEvent("admin_collection_load_failed");
    return {
      ok: false,
      message: `Content could not be loaded. Reference: ${id}`,
    };
  }
}

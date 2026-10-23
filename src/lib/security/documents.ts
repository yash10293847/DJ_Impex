import "server-only";

import { storage, VersionConflict } from "@/lib/admin/storage";
import { SecurityError } from "./errors";

/** CAS is shared by every serverless instance; a process-local lock is insufficient. */
export async function updateSecurityDoc<T, R>(
  key: string,
  parse: (text: string | null) => T,
  update: (value: T) => { value: T; result: R },
): Promise<R> {
  const driver = storage();
  for (let attempt = 0; attempt < 8; attempt++) {
    const doc = await driver.readDoc(key);
    const next = update(parse(doc?.text ?? null));
    try {
      await driver.writeDoc(key, JSON.stringify(next.value), doc?.version ?? null);
      return next.result;
    } catch (error) {
      if (!(error instanceof VersionConflict)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 30 * (attempt + 1)));
    }
  }
  // Contention or storage failure must never bypass an auth/abuse check.
  throw new SecurityError(503, "Security checks are temporarily unavailable.");
}

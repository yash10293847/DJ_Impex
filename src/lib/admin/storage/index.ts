import "server-only";

import { blobDriver } from "./blob-driver";
import { fileSystemDriver } from "./fs-driver";
import type { StorageDriver } from "./driver";
import { SecurityError } from "@/lib/security/errors";

/**
 * Blob when a token is configured, the filesystem otherwise.
 *
 * The token is present on Vercel because the store is linked to the project,
 * and absent in a plain checkout, so development keeps writing real files in
 * data/ and public/uploads where they can be read, diffed and committed.
 */
export function storage(): StorageDriver {
  if ((process.env.VERCEL || process.env.NODE_ENV === "production") && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new SecurityError(503, "Persistent storage is not configured.");
  }
  return process.env.BLOB_READ_WRITE_TOKEN ? blobDriver : fileSystemDriver;
}

export { VersionConflict } from "./driver";
export type { StorageDriver, StoredDoc, StoredMedia } from "./driver";

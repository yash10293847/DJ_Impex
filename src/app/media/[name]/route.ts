import { securityEvent } from "@/lib/security/errors";
import { storage } from "@/lib/admin/storage";

export const dynamic = "force-dynamic";

/**
 * Serves an image uploaded through the admin panel.
 *
 * It exists because the Blob store is private: nothing in it is reachable
 * without the token, and the token stays on the server. This route is the one
 * deliberate opening, and it only ever reads a single file name under the
 * uploads prefix -- never a document, never a path with a separator in it.
 *
 * It sits outside /admin on purpose. These are website images, and the
 * next/image optimiser fetches them server-side without the browser's
 * credentials, so putting them behind the admin password would break every
 * thumbnail the moment one was set.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,200}$/.test(name) || name.includes("..")) {
    return new Response("Not found.", { status: 404 });
  }

  let media;
  try {
    media = await storage().readMedia(name);
  } catch {
    securityEvent("media_read_failed");
    return new Response("Not available.", { status: 500 });
  }

  if (!media) return new Response("Not found.", { status: 404 });

  return new Response(media.stream, {
    headers: {
      "content-type": media.contentType,
      // Not `immutable`, despite the file name carrying a timestamp and never
      // being rewritten. Deleting an image in the panel removes the blob, but a
      // year-long edge cache went on serving the bytes from the CDN long after
      // -- measured: the store reported the blob gone while the URL still
      // returned the JPEG. If someone deletes an image because it should not be
      // public, it has to stop being public. The shared cache therefore
      // re-checks every minute; browsers, which only ever hold a file the
      // person already saw, keep theirs for an hour.
      "cache-control": "public, max-age=3600, s-maxage=60, stale-while-revalidate=60",
      "content-disposition": "inline",
      "content-security-policy": "default-src 'none'; sandbox; frame-ancestors 'none'",
      "x-content-type-options": "nosniff",
    },
  });
}

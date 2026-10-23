import { securityEvent } from "@/lib/security/errors";
import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Push a panel change onto the public site straight away.
 *
 * The journal and the home page are cached so visitors get static HTML. Without
 * this, an edit made in the panel would sit unseen until the hourly
 * revalidation, which reads as "it saved but the website has not changed" --
 * exactly the thing the panel should never do.
 *
 * Revalidation is best effort. If it fails the write has still happened, so it
 * is logged rather than turned into an error the operator cannot act on.
 */
function safely(path: string, type?: "page" | "layout"): void {
  try {
    revalidatePath(path, type);
  } catch {
    securityEvent("revalidation_failed");
  }
}

/** After any change to a post. `slug` covers the post's own page. */
export function revalidateJournal(slugs: Array<string | undefined> = []): void {
  safely("/journal");
  for (const slug of slugs) {
    if (slug) safely(`/journal/${slug}`);
  }
}

/** After any change to the gallery. */
export function revalidateGallery(): void {
  safely("/");
}

/** After a design slot changes. Slots appear on the home page, /about, /nabeen, /nabeen-x-ali-nuhu, /journal and /vision. */
export function revalidateSlots(): void {
  safely("/");
  safely("/about");
  safely("/nabeen");
  safely("/nabeen-x-ali-nuhu");
  safely("/journal");
  safely("/vision");
}

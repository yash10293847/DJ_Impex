import { securityEvent } from "@/lib/security/errors";
import "server-only";

import { getGalleryImages, type GalleryImage } from "@/lib/content";
import { readCollection } from "@/lib/admin/store";

/**
 * The World of Nabeen tiles, as the admin panel says they are.
 *
 * The panel is the source of truth. It used to be only half of one: the
 * shipped swatches were read straight from public/images/gallery and the
 * panel's rows were appended, which meant deleting a swatch in the panel
 * removed it from the panel's own list and changed nothing on the website. The
 * Delete button implied a control it did not have.
 *
 * Now the collection decides. Removing a row hides the tile; the underlying
 * file stays in the project, which is the only sensible outcome for an image
 * that is committed to the repository rather than uploaded.
 *
 * The folder remains the fallback for the case where the store cannot be read
 * at all, so a home page still shows its gallery rather than an empty band.
 */
export async function getGalleryTiles(): Promise<GalleryImage[]> {
  try {
    const rows = await readCollection("images");
    return rows
      .filter((image) => image.usage === "gallery")
      .map((image) => ({ src: image.src, name: image.title, alt: image.alt }));
  } catch {
    securityEvent("gallery_store_unavailable");
    return getGalleryImages();
  }
}

import { requireAdminPage } from "@/lib/security/session";
import { DataError } from "@/components/admin/DataError";
import { ImageManager } from "@/components/admin/ImageManager";
import { loadCollection } from "@/lib/admin/load";

export const dynamic = "force-dynamic";

export default async function AdminImagesPage() {
  await requireAdminPage();
  const result = await loadCollection("images");
  if (!result.ok) return <DataError title="Image gallery" message={result.message} />;
  return <ImageManager initial={result.rows} />;
}

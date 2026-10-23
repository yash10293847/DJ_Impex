import { requireAdminPage } from "@/lib/security/session";
import { BlogManager } from "@/components/admin/BlogManager";
import { DataError } from "@/components/admin/DataError";
import { loadCollection } from "@/lib/admin/load";

export const dynamic = "force-dynamic";

export default async function AdminBlogsPage() {
  await requireAdminPage();
  const result = await loadCollection("blogs");
  if (!result.ok) return <DataError title="Blog manager" message={result.message} />;
  return <BlogManager initial={result.rows} />;
}

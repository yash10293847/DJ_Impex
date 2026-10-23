import { requireAdminPage } from "@/lib/security/session";
import { DataError } from "@/components/admin/DataError";
import { EnquiryManager } from "@/components/admin/EnquiryManager";
import { MailStatus } from "@/components/admin/MailStatus";
import { loadCollection } from "@/lib/admin/load";

export const dynamic = "force-dynamic";

export default async function AdminEnquiriesPage() {
  await requireAdminPage();
  const result = await loadCollection("enquiries");
  if (!result.ok) return <DataError title="Enquiries" message={result.message} />;
  const newestFirst = [...result.rows].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      {/* Only appears when mail is misconfigured, which is the case worth
          interrupting someone for. */}
      <MailStatus />
      <EnquiryManager initial={newestFirst} />
    </div>
  );
}

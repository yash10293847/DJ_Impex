import { requireAdminPage } from "@/lib/security/session";
import { Wear2CareManager } from "@/components/admin/Wear2CareManager";
import { resolveSlots } from "@/lib/slots";

export const dynamic = "force-dynamic";

export default async function AdminWear2CarePage() {
  await requireAdminPage();
  const slots = await resolveSlots();
  return <Wear2CareManager initial={slots} />;
}

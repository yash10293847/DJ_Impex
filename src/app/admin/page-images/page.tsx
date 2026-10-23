import { requireAdminPage } from "@/lib/security/session";
import { SlotManager } from "@/components/admin/SlotManager";
import { resolveSlots } from "@/lib/slots";

export const dynamic = "force-dynamic";

const isManagedElsewhere = (slot: { id: string }) =>
  slot.id.startsWith("wear2care-") ||
  slot.id.startsWith("fabric-") ||
  slot.id.startsWith("nabeen-") ||
  slot.id === "home-brief";

// resolveSlots falls back to the shipped defaults rather than throwing, so
// there is no error state to render here: the worst case is the page showing
// the design's own images, which is what the site would be showing too.
export default async function AdminPageImages() {
  await requireAdminPage();
  const slots = await resolveSlots();
  return <SlotManager initial={slots.filter((slot) => !isManagedElsewhere(slot))} />;
}

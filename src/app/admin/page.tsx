import { requireAdminPage } from "@/lib/security/session";
import { redirect } from "next/navigation";

/**
 * There is no dashboard any more, at the agency's request.
 *
 * /admin still has to lead somewhere: it is the address people have, and the
 * logo in the sidebar points at it. It sends them to the image gallery, the
 * first real section. The one thing the dashboard carried that mattered -- the
 * warning that enquiry email is not configured -- moved to the Enquiries
 * screen, where somebody wondering why no mail arrived is already looking.
 */
export default async function AdminIndex() {
  await requireAdminPage();
  redirect("/admin/images");
}

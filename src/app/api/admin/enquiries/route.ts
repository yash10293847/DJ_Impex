import { guardAdminRequest } from "@/lib/admin/api";
import { handleError, ok } from "@/lib/admin/api";
import { ENQUIRY_STATUSES, type EnquiryStatus } from "@/lib/admin/schemas";
import { readCollection } from "@/lib/admin/store";

export const dynamic = "force-dynamic";

/**
 * Enquiries are written by the public form, not by this panel, so there is no
 * POST here. Filtering is supported server side for the same reason the list
 * page filters client side: whichever the caller prefers.
 */
export async function GET(request: Request) {
  try {
    await guardAdminRequest(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const query = (searchParams.get("q") ?? "").trim().toLowerCase();

    let enquiries = await readCollection("enquiries");

    if (status && ENQUIRY_STATUSES.includes(status as EnquiryStatus)) {
      enquiries = enquiries.filter((row) => row.status === status);
    }
    if (query) {
      enquiries = enquiries.filter((row) =>
        [row.name, row.email, row.subject, row.message].some((field) => field.toLowerCase().includes(query)),
      );
    }

    enquiries = [...enquiries].sort((a, b) => b.date.localeCompare(a.date));
    return ok({ enquiries });
  } catch (error) {
    return handleError("enquiries:list", error);
  }
}

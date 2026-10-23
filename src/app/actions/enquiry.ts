"use server";

import { headers } from "next/headers";
import nodemailer from "nodemailer";
import { escapedEnquiry, smtpConfiguration } from "@/lib/security/mail";
import { assertSameOrigin, clientIdentifier, privateIdentifier } from "@/lib/security/request";
import { consumeLimits } from "@/lib/security/rate-limit";
import { SecurityError, securityEvent } from "@/lib/security/errors";

import { recordEnquiry } from "@/lib/admin/inbox";
import { enquirySchema, formDataToEnquiry, type Enquiry, type EnquiryState } from "@/lib/enquiry";

function asText(enquiry: Enquiry): string {
  const fullWhatsApp = `${enquiry.countryCode} ${enquiry.whatsappNumber}`;
  const rows: Array<[string, string]> = [
    ["Name", enquiry.fullName],
    ["WhatsApp", fullWhatsApp],
    ["Email", enquiry.email || "—"],
    ["Fabrics of interest", enquiry.fabrics.length ? enquiry.fabrics.join(", ") : "—"],
    ["Usage", enquiry.usage.length ? enquiry.usage.join(", ") : "—"],
    ["Message", enquiry.message || "—"],
    ["Form", enquiry.variant === "short" ? "Contact pop-up" : "Homepage contact section"],
  ];
  return rows.map(([label, value]) => `${label}: ${value}`).join("\n");
}

function getAdminHtml(input: Enquiry): string {
  const enquiry = escapedEnquiry(input);
  const fullWhatsApp = `${enquiry.countryCode} ${enquiry.whatsappNumber}`;
  const cleanNumber = fullWhatsApp.replace(/[^0-9]/g, "");
  const rows = [
    ["Full Name", enquiry.fullName],
    [
      "WhatsApp Number",
      `<a href="https://wa.me/${cleanNumber}" style="color: #172850; font-weight: 600; text-decoration: underline;">${fullWhatsApp}</a>`,
    ],
    [
      "Email",
      enquiry.email
        ? `<a href="mailto:${enquiry.email}" style="color: #172850; text-decoration: underline;">${enquiry.email}</a>`
        : "—",
    ],
    ["Fabrics of Interest", enquiry.fabrics.length ? enquiry.fabrics.join(", ") : "—"],
    ["Usage", enquiry.usage.length ? enquiry.usage.join(", ") : "—"],
    ["Message", enquiry.message || "—"],
    ["Form Source", enquiry.variant === "short" ? "Contact Pop-up" : "Homepage Contact Section"],
  ];

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Fabric Enquiry</title>
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .content-cell { padding: 18px !important; }
      .row-label { width: 100% !important; display: block !important; padding-bottom: 2px !important; }
      .row-val { width: 100% !important; display: block !important; padding-top: 2px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 20px 10px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table class="container" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #172850; padding: 26px 24px; text-align: left; border-bottom: 3px solid #B8925A;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">Nabeen&reg; &middot; New Fabric Enquiry</h1>
              <p style="margin: 6px 0 0 0; color: #cbd5e1; font-size: 13px;">Submitted on ${new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })} at ${new Date().toLocaleTimeString("en-IN", { timeStyle: "short" })}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="content-cell" style="padding: 24px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; line-height: 1.6; border-collapse: collapse;">
                ${rows
                  .map(
                    ([label, val]) => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td class="row-label" style="padding: 10px 8px; font-weight: 600; color: #475569; width: 36%; vertical-align: top;">${label}</td>
                      <td class="row-val" style="padding: 10px 8px; color: #0f172a; vertical-align: top;">${val}</td>
                    </tr>
                  `,
                  )
                  .join("")}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 24px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center;">
              D J Impex &amp; Co. &middot; B-90 Gopal Gully Mangaldas Market Mumbai 400002
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getCustomerHtml(input: Enquiry): string {
  const enquiry = escapedEnquiry(input);
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Enquiry Confirmation - Nabeen Luxury Fabrics</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .fluid-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .mobile-title { font-size: 20px !important; }
      .mobile-text { font-size: 14px !important; line-height: 1.6 !important; }
      .btn-table { width: 100% !important; }
      .btn-link { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 10px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table class="container" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
          <!-- Header Banner -->
          <tr>
            <td align="center" style="background-color: #172850; padding: 32px 24px 28px; text-align: center;">
              <h1 class="mobile-title" style="margin: 0; font-size: 24px; font-weight: 600; color: #ffffff; letter-spacing: 2px;">NABEEN<span style="font-size: 14px; vertical-align: top;">&reg;</span></h1>
              <p style="margin: 6px 0 0 0; font-size: 12px; color: #B8925A; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 500;">Luxury Fabrics by DJI &middot; Est. 1995</p>
            </td>
          </tr>

          <!-- Gold Accent Rule -->
          <tr>
            <td style="height: 3px; background-color: #B8925A; line-height: 3px; font-size: 3px;">&nbsp;</td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="fluid-padding" style="padding: 32px 32px 24px; text-align: left;">
              <p class="mobile-text" style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #1e293b;">Dear <strong>${enquiry.fullName}</strong>,</p>
              
              <p class="mobile-text" style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Thank you for your enquiry with <strong>Nabeen&reg;</strong>. We have safely received your request regarding our fabric collections.
              </p>
              
              <p class="mobile-text" style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Our team is reviewing your requirements and will reach out to you directly on WhatsApp at <strong>${enquiry.countryCode} ${enquiry.whatsappNumber}</strong>.
              </p>

              <!-- Summary Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-left: 3px solid #B8925A; border-radius: 4px; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; text-transform: uppercase; color: #172850; letter-spacing: 0.5px;">Your Enquiry Details</p>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; line-height: 1.6; color: #475569;">
                      ${enquiry.fabrics.length ? `<tr><td style="padding: 3px 0; width: 35%;"><strong>Fabrics:</strong></td><td style="padding: 3px 0; color: #0f172a;">${enquiry.fabrics.join(", ")}</td></tr>` : ""}
                      ${enquiry.usage.length ? `<tr><td style="padding: 3px 0; width: 35%;"><strong>Usage:</strong></td><td style="padding: 3px 0; color: #0f172a;">${enquiry.usage.join(", ")}</td></tr>` : ""}
                      ${enquiry.message ? `<tr><td style="padding: 3px 0; width: 35%; vertical-align: top;"><strong>Message:</strong></td><td style="padding: 3px 0; color: #0f172a;">${enquiry.message}</td></tr>` : ""}
                    </table>
                  </td>
                </tr>
              </table>

              <p class="mobile-text" style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                Warm regards,<br />
                <strong style="color: #1e293b;">The Nabeen&reg; Team</strong><br />
                D J Impex &amp; Co., Mumbai
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; line-height: 1.5; color: #64748b;">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #172850;">D J Impex &amp; Co. &middot; Star Export House</p>
              <p style="margin: 0 0 8px 0;">B-90, 2nd Building, Gopal Gully, Mangaldas Market, Mumbai 400002, Maharashtra, India</p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">This is an automated confirmation of your enquiry sent via our official website.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function submitEnquiryInternal(formData: FormData): Promise<EnquiryState> {
  const headerList = await headers();
  assertSameOrigin(headerList);
  if (String(formData.get("website") ?? "")) return { status: "success", message: "Enquiry received. Our team will contact you on WhatsApp shortly." };
  await consumeLimits("contact", [
    { key: `ip:${clientIdentifier(headerList)}`, limit: 5, windowMs: 10 * 60 * 1000 },
    { key: "global", limit: 50, windowMs: 60 * 60 * 1000 },
  ]);
  const parsed = enquirySchema.safeParse(formDataToEnquiry(formData));

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors,
    };
  }

  const enquiry = parsed.data;

  // The honeypot is invisible to people. If it is filled in, accept quietly.
  if (enquiry.website) {
    return {
      status: "success",
      message: "Enquiry received. Our team will contact you on WhatsApp shortly.",
    };
  }

  await consumeLimits("contact", [{ key: `duplicate:${privateIdentifier(JSON.stringify(enquiry))}`, limit: 1, windowMs: 5 * 60 * 1000 }]);

  // Store the enquiry before attempting the send, so a mail failure still
  // leaves the lead somewhere a person looks. It never throws.
  const stored = await recordEnquiry(enquiry);

  /**
   * What to tell the customer when the email does not go out.
   *
   * This used to fail loudly in every case, on the reasoning that a form which
   * lies about delivering is worse than one that fails. That was right when the
   * only other copy was a line in a server log that rolls off a serverless host.
   * It is no longer the situation: the enquiry is now in the admin panel's
   * store, which survives a deploy and is the screen the team actually reads.
   *
   * So a stored enquiry is a received enquiry, and saying otherwise turns a
   * captured lead into a customer who has been told to go away. The wording
   * says "received" rather than "sent", because received is what is true.
   * A failure is still logged at error level, and the panel's dashboard says
   * plainly that mail is misconfigured.
   */
  const whenMailFails = (): EnquiryState =>
    stored
      ? {
          status: "success",
          message: "Enquiry received. Our team will contact you on WhatsApp shortly.",
        }
      : {
          status: "error",
          message: "We could not send your enquiry just now. Please message us on WhatsApp.",
        };

  if (!stored) return whenMailFails();
  try {
    if (process.env.CONTACT_EMAIL_ENABLED === "false") return whenMailFails();
    const { transport, from, to: enquiryTo } = smtpConfiguration();
    const enquiryFrom = { name: "Nabeen Luxury Fabrics", address: from };
    const transporter = nodemailer.createTransport(transport);

    // 1. Send all enquiry details to the business
    await transporter.sendMail({
      from: enquiryFrom,
      to: enquiryTo,
      replyTo: enquiry.email || undefined,
      subject: `New Fabric Enquiry: ${enquiry.fullName} (${enquiry.countryCode} ${enquiry.whatsappNumber})`,
      text: asText(enquiry),
      html: getAdminHtml(enquiry),
      headers: {
        "X-Priority": "3",
        "X-Mailer": "Nabeen Luxury Fabrics Mailer",
      },
    });

    // 2. Send auto-reply confirmation to the customer (if email provided)
    let acknowledge = Boolean(enquiry.email);
    if (acknowledge) {
      try {
        await consumeLimits("recipient", [{ key: privateIdentifier(enquiry.email.toLowerCase()), limit: 3, windowMs: 86400000 }]);
      } catch { acknowledge = false; }
    }
    if (acknowledge) {
      const customerText = `Dear ${enquiry.fullName},\n\nThank you for reaching out to Nabeen®. We have received your enquiry regarding our luxury fabric collection.\n\nOur team is reviewing your requirements and will reach out to you directly on WhatsApp (${enquiry.countryCode} ${enquiry.whatsappNumber}).\n\nEnquiry Summary:\n- Fabrics of interest: ${enquiry.fabrics.length ? enquiry.fabrics.join(", ") : "General enquiry"}\n${enquiry.usage.length ? `- Usage: ${enquiry.usage.join(", ")}\n` : ""}${enquiry.message ? `- Message: ${enquiry.message}\n` : ""}\nWarm regards,\nThe Nabeen® Team\nD J Impex & Co., Mumbai`;

      await transporter.sendMail({
        from: enquiryFrom,
        to: enquiry.email,
        replyTo: enquiryTo, // Replies from customer go directly to your business email
        subject: "Enquiry Confirmation - Nabeen Luxury Fabrics",
        text: customerText,
        html: getCustomerHtml(enquiry),
        headers: {
          "Auto-Submitted": "auto-replied",
          "X-Auto-Response-Suppress": "All",
          Precedence: "bulk",
          "X-Priority": "3",
          "X-Mailer": "Nabeen Luxury Fabrics Mailer",
        },
      });
    }
  } catch {
    securityEvent("smtp_send_failed");
    return whenMailFails();
  }

  return {
    status: "success",
    message: "Enquiry received. Our team will contact you on WhatsApp shortly.",
  };
}

export async function submitEnquiry(_previous: EnquiryState, formData: FormData): Promise<EnquiryState> {
  try { return await submitEnquiryInternal(formData); }
  catch (error) {
    if (error instanceof SecurityError && error.status < 500) return { status: "error", message: error.message };
    securityEvent("enquiry_security_unavailable");
    return { status: "error", message: "We could not receive your enquiry just now. Please message us on WhatsApp." };
  }
}

import { headers } from "next/headers";
import { ContactPopup } from "@/components/contact/ContactPopup";
import { FloatingActions } from "@/components/contact/FloatingActions";
import { WhatsAppModal } from "@/components/contact/WhatsAppModal";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { OverlayProvider } from "@/components/layout/OverlayContext";
import { Preloader } from "@/components/layout/Preloader";
import { SkipLink } from "@/components/layout/SkipLink";
import { getSite } from "@/lib/content";
import { directionsLink, mailtoLink, telLink, whatsappLink } from "@/lib/contact";
import { jsonLdScript, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

/**
 * Everything that wraps a marketing page: header, footer, preloader, pop-up.
 *
 * This used to live in the root layout, which meant every route got it. The
 * admin panel must not: a preloader film and a floating WhatsApp button have no
 * place over a data table. The root layout is now just <html>/<body>, the site
 * routes sit in the (site) group and wear this, and /admin wears its own shell.
 *
 * not-found.tsx has to stay at the app root to catch unmatched URLs, so it
 * renders this directly rather than inheriting it.
 */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const site = getSite();
  const whatsapp = whatsappLink();
  const popupWhatsapp = whatsappLink(
    "Hello Nabeen team, I’m interested in your fabrics. Please share available designs, prices, and order details.",
  );

  return (
    <>
      <SkipLink />

      <OverlayProvider>
        <Header
          navigation={site.navigation}
          contact={{
            whatsapp,
            tel: telLink(),
            telDisplay: site.contact.phonePrimary.display,
            email: mailtoLink("Fabric enquiry"),
            emailDisplay: site.contact.emailPrimary.value,
          }}
        />

        <main id="main">{children}</main>

        <Footer />

        <FloatingActions whatsappHref={whatsapp} directionsHref={directionsLink()} />
        <Preloader />

        <ContactPopup
          whatsappHref={popupWhatsapp}
          line={site.popup.line}
          cta={site.popup.cta}
          delaySeconds={site.popup.delaySeconds}
          fabrics={site.fabricTypes.items.map((f) => f.name)}
        />
        <WhatsAppModal fabrics={site.fabricTypes.items.map((f) => f.name)} />
      </OverlayProvider>

      {/* Organisation and WebSite markup describes the business and enables rich snippet indexing */}
      <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(organizationJsonLd())} />
      <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(websiteJsonLd())} />
    </>
  );
}

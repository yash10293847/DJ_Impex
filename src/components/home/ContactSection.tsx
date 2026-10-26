import Image from "next/image";
import { ExternalLink, MapPin } from "lucide-react";
import { ContactChannels } from "@/components/contact/ContactChannels";
import { EnquiryForm } from "@/components/contact/EnquiryForm";
import { Container } from "@/components/ui/Container";
import { getSite } from "@/lib/content";
import { whatsappLink } from "@/lib/contact";

const MAPS_PLACE_URL =
  "https://www.google.com/maps/place/D+J+Impex+%26+Co.+(DJI)/@18.9481781,72.8319929,17z/data=!4m6!3m5!1s0x3be7cfd0a3ffc597:0x746cc6b47455ff2c!8m2!3d18.9481781!4d72.8319929!16s%2Fg%2F11f61wcms2";
const MAPS_EMBED_URL = "https://maps.google.com/maps?q=18.9481781,72.8319929&hl=en&z=16&output=embed";

/**
 * The exact contact section from /contact, situated on the home page directly before the footer.
 */
export function ContactSection({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const site = getSite();

  return (
    <section
      id="contact"
      className="border-line relative scroll-mt-12 overflow-hidden border-t border-b bg-white pt-[calc(var(--spacing-section)*0.73)] pb-12 sm:pb-16 lg:scroll-mt-14 lg:pb-20"
    >
      {/* Luxury white fabric drape background */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src="/images/brand-imagery/white-fabric-drape.jpg"
          alt=""
          fill
          sizes="100vw"
          quality={90}
          className="object-cover object-top opacity-70"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-white/70 backdrop-blur-[0.5px]" />
      </div>
      <Container className="relative z-10">
        <div className="grid min-w-0 items-start gap-10 lg:grid-cols-[5fr_7fr] lg:gap-20">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
            <div className="bg-navy on-dark min-w-0 rounded-2xl p-6 text-white shadow-lg sm:p-8 lg:p-9">
              <h2 className="t-h3 text-white"><span>Talk to us directly</span></h2>
              <div className="mt-5 sm:mt-6">
                <ContactChannels onDark={true} />
              </div>
            </div>

            <div className="min-w-0">
              <h3 className="t-h3 text-navy"><span>Head Office</span></h3>
              <p className="text-slate mt-0.5 text-sm"><span>Visit us at our location below.</span></p>
              <a
                href={MAPS_PLACE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group border-line bg-sand/30 relative mt-2.5 block h-[165px] w-full min-w-0 overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-md"
                aria-label="Open company location in Google Maps (opens in a new tab)"
              >
                <iframe
                  title="D J Impex & Co. location map"
                  src={MAPS_EMBED_URL}
                  className="pointer-events-none absolute -top-[48px] -left-[30px] h-[calc(100%+96px)] w-[calc(100%+60px)] border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="bg-navy/90 group-hover:bg-navy absolute top-3 right-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur-sm transition-colors">
                  <MapPin size={13} className="text-accent" />
                  <span>Open in Maps</span>
                  <ExternalLink size={12} className="text-white/70" />
                </div>
              </a>
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="t-h3"><span>Send an enquiry</span></h2>
            <EnquiryForm
              variant="full"
              fabrics={site.fabricTypes.items.map(({ slug, name }) => ({ slug, name }))}
              whatsappHref={whatsappLink()}
              className="mt-8"
            />
          </div>
        </div>
      </Container>
      {children}
    </section>
  );
}

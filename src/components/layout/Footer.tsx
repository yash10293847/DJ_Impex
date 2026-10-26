import Image from "next/image";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";

import { LanguageSelector } from "@/components/ui/LanguageSelector";
import { withReg } from "@/components/ui/Reg";
import { TbcTag } from "@/components/ui/TbcTag";
import { TrackedLink } from "@/components/ui/TrackedLink";
import { getSite } from "@/lib/content";
import { directionsLink, fabricPrefill, mailtoLink, telLink, whatsappLink } from "@/lib/contact";
import { visible } from "@/lib/site";

function SocialIcon({ name }: { name: string }) {
  if (name === "Instagram") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 fill-none" strokeWidth="1.8">
        <defs>
          <linearGradient
            id="instagram-gradient"
            x1="3"
            y1="21"
            x2="21"
            y2="3"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FEDA75" />
            <stop offset="0.42" stopColor="#FA7E1E" />
            <stop offset="0.7" stopColor="#D62976" />
            <stop offset="1" stopColor="#4F5BD5" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#instagram-gradient)" stroke="none" />
        <rect x="6.5" y="6.5" width="11" height="11" rx="3" stroke="white" />
        <circle cx="12" cy="12" r="2.5" stroke="white" />
        <circle cx="15.7" cy="8.3" r="0.65" fill="white" stroke="none" />
      </svg>
    );
  }

  if (name === "Facebook") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0">
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#1877F2" />
        <path
          fill="white"
          d="M13.5 20v-6.35h2.13l.32-2.48H13.5V9.59c0-.72.2-1.21 1.23-1.21h1.31V6.16c-.23-.03-1-.1-1.9-.1-1.88 0-3.17 1.15-3.17 3.26v1.85H8.84v2.48h2.13V20h2.53Z"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#E60023" />
      <path
        fill="white"
        d="M12.54 4.1c-4.4 0-6.62 3.15-6.62 5.78 0 1.6.6 3.02 1.9 3.55.21.09.4.01.46-.23l.17-.7c.06-.23.04-.31-.12-.5-.36-.42-.59-.96-.59-1.73 0-2.23 1.67-4.23 4.35-4.23 2.37 0 3.68 1.45 3.68 3.39 0 2.55-1.13 4.7-2.8 4.7-.93 0-1.62-.77-1.4-1.72.27-1.13.8-2.35.8-3.16 0-.73-.39-1.34-1.2-1.34-.95 0-1.71.98-1.71 2.3 0 .84.28 1.41.28 1.41l-1.13 4.8c-.33 1.41-.05 3.14-.03 3.31.02.1.15.12.22.05.09-.1 1.23-1.52 1.62-2.93.11-.4.64-2.5.64-2.5.32.6 1.25 1.14 2.24 1.14 2.95 0 4.95-2.69 4.95-6.28 0-2.72-2.3-5.26-5.8-5.26Z"
      />
    </svg>
  );
}

export function Footer() {
  const site = getSite();
  const { contact } = site;
  const socials = visible(site.social);
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer on-dark bg-navy-deep relative overflow-hidden text-white">
      {/* Full-bleed luxury fabric background across the entire footer */}
      <Image
        src="/images/footer/fabric-banner.jpg"
        alt=""
        fill
        sizes="100vw"
        quality={88}
        className="pointer-events-none object-cover object-center brightness-75"
      />
      {/* Rich dark navy overlay to ensure optimal contrast and readability */}
      <div aria-hidden="true" className="bg-navy-deep/80 pointer-events-none absolute inset-0" />

      <div className="relative z-10">
        <div className="container-site grid gap-8 pt-10 pb-10 md:grid-cols-2 lg:grid-cols-[1.4fr_0.85fr_1.15fr_1.6fr] lg:gap-8 lg:pt-20 lg:pb-14">
          <div className="pointer-events-none lg:translate-y-[38%]">
            <Image
              src="/images/logos/nabeen-logo-white.png"
              alt="Nabeen, luxury fabrics by DJI"
              width={1088}
              height={345}
              className="h-10 w-auto"
            />
          </div>

          <nav aria-label="Footer">
            <h2 className="t-small text-accent mb-4 font-semibold">Explore</h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/80 lg:grid-cols-1 lg:gap-2.5">
              {site.navigation.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition-colors hover:text-white">
                    {withReg(item.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="footer-contact min-w-0">
            <h2 className="t-small text-accent mb-4 font-semibold">Talk to us</h2>
            <ul className="grid gap-2.5 text-white/80">
              <li>
                <TrackedLink
                  href={telLink()}
                  event="call_click"
                  location="footer"

                  className="transition-colors hover:text-white"
                >
                  {contact.phonePrimary.display}
                </TrackedLink>
                <TbcTag status={contact.phonePrimary.status} note={contact.phonePrimary.note} />
              </li>
              <li>
                <TrackedLink
                  href={`tel:${contact.phoneSecondary.e164}`}
                  event="call_click"
                  location="footer"

                  className="transition-colors hover:text-white"
                >
                  {contact.phoneSecondary.display}
                </TrackedLink>
                <TbcTag status={contact.phoneSecondary.status} note={contact.phoneSecondary.note} />
              </li>
              <li>
                <TrackedLink
                  href={mailtoLink("Fabric enquiry")}
                  event="email_click"
                  location="footer"

                  className="transition-colors hover:text-white"
                >
                  {contact.emailPrimary.value}
                </TrackedLink>
              </li>
              <li>
                <TrackedLink
                  href={mailtoLink("Fabric enquiry", contact.emailAdmin.value)}
                  event="email_click"
                  location="footer"

                  className="transition-colors hover:text-white"
                >
                  {contact.emailAdmin.value}
                </TrackedLink>
              </li>
              <li>
                <TrackedLink
                  href={mailtoLink("Fabric enquiry", contact.emailSecondary.value)}
                  event="email_click"
                  location="footer"

                  className="transition-colors hover:text-white"
                >
                  {contact.emailSecondary.value}
                </TrackedLink>
              </li>
              <li className="mt-1">
                <address className="text-white/70 not-italic">
                  {contact.address.lines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
                <TrackedLink
                  href={directionsLink()}
                  event="directions_click"
                  location="footer"
                  className="mt-2 inline-block text-white/80 transition-colors hover:text-white"
                >
                  Get directions
                </TrackedLink>
                <TbcTag status={contact.address.status} note={contact.address.note} />
              </li>
            </ul>
          </div>

          {socials.length > 0 ? (
            <div>
              <h2 className="t-small text-accent mb-4 font-semibold">Follow</h2>
              <ul className="flex items-center gap-3 text-white/80">
                {socials.map((social) => (
                  <li key={social.name}>
                    {social.url ? (
                      <a
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Visit Nabeen on ${social.name}`}
                        className="inline-flex size-11 items-center justify-center transition-transform hover:scale-110 focus-visible:scale-110 lg:size-8"
                      >
                        <SocialIcon name={social.name} />
                      </a>
                    ) : (
                      <span
                        className="inline-flex size-8 items-center justify-center text-white/70"
                        aria-label={social.name}
                      >
                        <SocialIcon name={social.name} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-wrap gap-3 lg:mt-6 lg:w-36 lg:flex-col">
                <TrackedLink
                  href={telLink()}
                  event="call_click"
                  location="footer_actions"

                  className="btn btn-primary !h-11 !justify-center !px-4 !text-sm lg:!w-full"
                >
                  <Phone aria-hidden="true" size={14} strokeWidth={1.8} />
                  <span>Call us</span>
                </TrackedLink>
                <TrackedLink
                  href={mailtoLink("Fabric enquiry")}
                  event="email_click"
                  location="footer_actions"

                  className="btn btn-outline !h-11 !justify-center !border-white/20 !px-4 !text-sm !text-white hover:!bg-white/10 lg:!w-full"
                >
                  <Mail aria-hidden="true" size={14} strokeWidth={1.8} />
                  <span>Mail us</span>
                </TrackedLink>
              </div>
            </div>
          ) : null}
        </div>

        <div className="container-site relative z-10 border-t border-white/15 py-8">
          <h2 className="visually-hidden">Fabrics</h2>
          <ul className="flex flex-wrap gap-x-5 gap-y-3 lg:gap-x-6">
            {site.fabricTypes.items.map((fabric) => (
              <li key={fabric.slug}>
                <TrackedLink
                  href={whatsappLink(fabricPrefill(fabric.name))}
                  event="whatsapp_click"
                  location="footer"
                  className="t-small text-white/70 transition-colors hover:text-white"
                >
                  {fabric.name}
                </TrackedLink>
              </li>
            ))}
            <li>
              <TbcTag status={site.fabricTypes.status} note={site.fabricTypes._note} />
            </li>
          </ul>
        </div>

        <div className="border-t border-white/15 bg-black/20 py-6 sm:py-7">
          <div className="container-site">
            <p className="mx-auto max-w-[850px] text-center text-sm leading-relaxed text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
              <span className="block">
                {withReg(
                  "Nabeen® contributes a percentage of its profits to support child education in Africa.",
                )}
              </span>
              <span className="mt-1 block sm:mt-1.5">
                {withReg(
                  "Every dollar you spend at Nabeen® goes towards shaping a brighter future for Africa.",
                )}
              </span>
            </p>
          </div>
        </div>

        <div className="container-site flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-white/15 py-7 lg:gap-x-6">
          {/* The parent-company mark, per ASSETS.md. */}
          <Image
            src="/images/logos/dji-logo-transparent.png"
            alt="D J Impex & Co."
            width={736}
            height={735}
            className="h-10 w-10 shrink-0"
          />
          <p className="t-small text-white/60">
            © {year} {site.brand.company.value.replace(/\.$/, "")}. All rights reserved.
          </p>
          <p className="t-small text-white/60">{site.brand.starExportHouse.value}</p>

          <div className="ml-auto">
            <LanguageSelector variant="footer" />
          </div>
        </div>
      </div>
    </footer>
  );
}

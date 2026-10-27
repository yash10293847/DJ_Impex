"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { MobileMenu } from "@/components/layout/MobileMenu";
import { LanguageSelector } from "@/components/ui/LanguageSelector";
import { withReg } from "@/components/ui/Reg";
import type { NavItem } from "@/lib/site";

export type HeaderContact = {
  whatsapp: string;
  tel: string;
  telDisplay: string;
  email: string;
  emailDisplay: string;
};

/**
 * Transparent with the white logo over a page hero; white with the navy logo and
 * a hairline bottom border once the hero has scrolled past.
 *
 * "Past the hero" is measured from the hero itself (every hero carries data-hero),
 * not from a guessed scroll offset, so it is right on the tall home hero and on
 * the shorter inner ones alike. Pages without a hero start solid.
 *
 * The state lives in a data attribute rather than React state: it is a paint
 * concern, it changes on every scroll past the fold, and writing it in a layout
 * effect means the transparent header is correct on the very first frame.
 */
export function Header({ navigation, contact }: { navigation: NavItem[]; contact: HeaderContact }) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  // The menu belongs to the page it was opened on, so a navigation closes it
  // without an effect.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const menuOpen = openedAt === pathname;
  const [currentHash, setCurrentHash] = useState<string>("");

  useEffect(() => {
    const updateHash = () => {
      if (typeof window !== "undefined") {
        setCurrentHash(window.location.hash);
      }
    };

    updateHash();
    window.addEventListener("hashchange", updateHash);
    window.addEventListener("popstate", updateHash);

    if (pathname === "/") {
      let journalEl = document.getElementById("journal");
      let contactEl = document.getElementById("contact");

      const handleIntersection = () => {
        // The homepage sections may arrive after the navigation fallback.
        journalEl ??= document.getElementById("journal");
        contactEl ??= document.getElementById("contact");
        const scrollY = window.scrollY;
        const contactTop = contactEl ? contactEl.offsetTop - 300 : Infinity;
        const journalTop = journalEl ? journalEl.offsetTop - 200 : Infinity;

        if (contactEl && scrollY >= contactTop) {
          setCurrentHash("#contact");
        } else if (journalEl && scrollY >= journalTop) {
          setCurrentHash("#journal");
        } else {
          setCurrentHash("");
        }
      };

      const observer = new IntersectionObserver(
        () => {
          handleIntersection();
        },
        { rootMargin: "-80px 0px -40% 0px", threshold: [0, 0.1, 0.5] }
      );

      if (journalEl) observer.observe(journalEl);
      if (contactEl) observer.observe(contactEl);
      window.addEventListener("scroll", handleIntersection, { passive: true });

      return () => {
        observer.disconnect();
        window.removeEventListener("scroll", handleIntersection);
        window.removeEventListener("hashchange", updateHash);
        window.removeEventListener("popstate", updateHash);
      };
    }

    return () => {
      window.removeEventListener("hashchange", updateHash);
      window.removeEventListener("popstate", updateHash);
    };
  }, [pathname]);

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const setSolid = (solid: boolean) => {
      header.dataset.solid = String(solid);
    };

    let observer: IntersectionObserver | undefined;
    const observeHero = () => {
      const hero = document.querySelector("[data-hero]");
      if (!hero) {
        setSolid(true);
        return false;
      }
      setSolid(hero.getBoundingClientRect().bottom <= 72);
      observer = new IntersectionObserver(
        ([entry]) => setSolid(!entry.isIntersecting),
        { rootMargin: "-72px 0px 0px 0px", threshold: 0 },
      );
      observer.observe(hero);
      return true;
    };

    // A streamed route can hydrate its header while the loading screen is
    // still showing. Attach once the real hero arrives, then stop observing.
    const pendingHero = new MutationObserver(() => {
      if (observeHero()) pendingHero.disconnect();
    });
    if (!observeHero()) {
      pendingHero.observe(document.getElementById("main") ?? document.body, { childList: true, subtree: true });
    }
    return () => {
      observer?.disconnect();
      pendingHero.disconnect();
    };
  }, [pathname]);

  return (
    <>
      <header
        ref={headerRef}
        data-solid="true"
        className="site-header on-dark fixed inset-x-0 top-0 z-40 border-b border-transparent text-white transition-colors duration-[var(--duration-base)] data-[solid=true]:border-line data-[solid=true]:bg-white data-[solid=true]:text-navy"
      >
        <div className="flex h-16 w-full items-center justify-between gap-3 px-[var(--spacing-gutter)] sm:h-[4.5rem] sm:px-8 lg:h-[5.25rem] lg:gap-6 lg:px-12 xl:px-16">
          <Link href="/" aria-label="Nabeen, luxury fabrics by DJI: home" className="relative block shrink-0">
            <Image
              src="/images/logos/nabeen-logo-white.png"
              alt="Nabeen, luxury fabrics by DJI"
              width={1088}
              height={345}
              priority
              className="site-header__logo site-header__logo--white h-8 w-auto lg:h-10"
            />
            <Image
              src="/images/logos/nabeen-logo-navy.png"
              alt=""
              aria-hidden="true"
              width={1088}
              height={345}
              priority
              className="site-header__logo site-header__logo--navy absolute left-0 top-0 h-8 w-auto lg:h-10"
            />
          </Link>

          <div className="flex min-w-0 items-center gap-2 sm:gap-4 lg:gap-7">
            <nav aria-label="Main" className="site-header__nav hidden min-w-0 flex-wrap items-center justify-end gap-x-5 gap-y-1 xl:flex">
              {navigation.map((item) => {
                const isJournal = item.href === "/#journal";
                const isContact = item.href === "/#contact";
                const isHome = item.href === "/";
                const active = isJournal
                  ? pathname === "/" && currentHash === "#journal"
                  : isContact
                  ? pathname === "/" && currentHash === "#contact"
                  : isHome
                  ? pathname === "/" && currentHash !== "#journal" && currentHash !== "#contact"
                  : pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      if (isJournal) {
                        setCurrentHash("#journal");
                      } else if (isContact) {
                        setCurrentHash("#contact");
                      } else if (isHome) {
                        setCurrentHash("");
                      }
                    }}
                    aria-current={active ? "page" : undefined}
                    className={`border-b pb-0.5 text-[0.9375rem] font-medium transition-all duration-[var(--duration-quick)] ${
                      active
                        ? "border-accent opacity-100"
                        : "border-transparent opacity-85 hover:border-accent hover:opacity-100"
                    }`}
                  >
                    {withReg(item.label)}
                  </Link>
                );
              })}
            </nav>

            <LanguageSelector variant="header" />

            <button
              type="button"
              onClick={() => setOpenedAt(pathname)}
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              className="-mr-2 flex h-11 w-11 items-center justify-center xl:hidden"
            >
              <span className="visually-hidden">Open menu</span>
              <span aria-hidden="true" className="grid w-6 gap-[5px]">
                <span className="h-px w-full bg-current" />
                <span className="h-px w-full bg-current" />
                <span className="h-px w-full bg-current" />
              </span>
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={() => setOpenedAt(null)}
        navigation={navigation}
        contact={contact}
      />
    </>
  );
}

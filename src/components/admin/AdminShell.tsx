"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { ExternalLink, HeartHandshake, Images, KeyRound, Layers, LayoutPanelTop, LogOut, Mail, Menu, Moon, Newspaper, Sparkles, Sun, X } from "lucide-react";
import { logoutAdminAction } from "@/app/actions/admin-auth";
import { AdminNavigationHint } from "@/components/admin/AdminNavigationHint";
import { ChangePasswordModal } from "@/components/admin/ChangePasswordModal";

const NAV = [
  { href: "/admin/images", label: "Image gallery", Icon: Images },
  { href: "/admin/page-images", label: "Page images", Icon: LayoutPanelTop },
  { href: "/admin/the-nabeen-collection", label: "The Nabeen Collection", Icon: Sparkles },
  { href: "/admin/nabeen-collection", label: "Nabeen", Icon: Layers },
  { href: "/admin/wear2care", label: "Wear2Care images", Icon: HeartHandshake },
  { href: "/admin/blogs", label: "Blog manager", Icon: Newspaper },
  { href: "/admin/enquiries", label: "Enquiries", Icon: Mail },
  { href: "/admin/security", label: "Account security", Icon: KeyRound },
] as const;

const THEME_KEY = "nabeen-admin-theme";
export const THEME_CLASS = "admin-dark";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return pathname === "/admin/login" ? <>{children}</> : <AdminPanel pathname={pathname}>{children}</AdminPanel>;
}

function AdminPanel({ children, pathname }: { children: React.ReactNode; pathname: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const compact = useMediaQuery("(max-width: 1023px)");
  useFocusTrap(sidebarRef, menuOpen && compact, () => setMenuOpen(false));

  useEffect(() => {
    if (!menuOpen || !compact) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [menuOpen, compact]);

  useEffect(() => {
    if (!profileOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  /**
   * The theme lives on <html> as a class, not in React state.
   *
   * The inline script in the admin layout applies the stored choice before the
   * first paint, which is the only way to avoid a flash of the wrong theme.
   * Keeping a second copy in state would then either disagree with the
   * server-rendered markup on hydration or need an effect to catch up, so the
   * toggle writes straight to the DOM and both icons are rendered with CSS
   * choosing between them.
   */
  function toggleTheme() {
    const next = !document.documentElement.classList.contains(THEME_CLASS);
    document.documentElement.classList.toggle(THEME_CLASS, next);
    try {
      window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      /* Blocked storage: the toggle still works, it just is not remembered. */
    }
  }

  return (
    <div className="admin-panel min-h-dvh bg-[#f8fafc] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="lg:flex">
        {/* Sidebar */}
        <aside
          ref={sidebarRef}
          role={compact && menuOpen ? "dialog" : undefined}
          aria-modal={compact && menuOpen ? true : undefined}
          aria-label="Admin navigation"
          tabIndex={-1}
          className={`fixed inset-y-0 left-0 z-40 flex w-64 max-w-[calc(100%-3rem)] shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-slate-200 bg-white transition-transform lg:visible lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 dark:border-slate-800 dark:bg-slate-900 ${
            menuOpen ? "visible translate-x-0" : "invisible -translate-x-full"
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
            <Link href="/admin" className="text-sm font-semibold tracking-[0.18em] uppercase">
              Nabeen<sup className="text-[0.6em]">®</sup> admin
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="text-slate-500 lg:hidden"
              aria-label="Close the menu"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Admin sections" className="space-y-1 p-3">
            {NAV.map(({ href, label, Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm transition lg:min-h-0 ${
                    active
                      ? "bg-navy text-white dark:bg-slate-800 dark:text-white"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon size={17} aria-hidden="true" />
                  <span>{label}</span>
                  <AdminNavigationHint />
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-slate-200 p-3 dark:border-slate-800">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ExternalLink size={17} aria-hidden="true" />
              View the website
            </Link>
          </div>
        </aside>

        {menuOpen ? (
          <button
            type="button"
            aria-label="Close the menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          />
        ) : null}

        {/* Content */}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8 dark:border-slate-800 dark:bg-slate-900/90">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="text-slate-600 lg:hidden dark:text-slate-300"
              aria-label="Open the menu"
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            <p className="flex-1 truncate text-sm text-slate-500 dark:text-slate-400">
              Content and enquiries, stored in /data
            </p>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Switch between the light and dark theme"
            >
              <Moon size={16} aria-hidden="true" className="dark:hidden" />
              <Sun size={16} aria-hidden="true" className="hidden dark:block" />
            </button>

            {/* Circular Admin Profile Avatar with Logout & Change Password Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                aria-expanded={profileOpen}
                aria-haspopup="true"
                aria-label="Admin account menu"
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#52968e] text-sm font-bold text-white shadow-sm ring-2 ring-transparent transition hover:bg-[#437d76] hover:ring-[#52968e]/30 focus:outline-none focus:ring-2 focus:ring-[#52968e] cursor-pointer select-none"
              >
                A
                <span className="absolute bottom-0 right-0 block size-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </button>

              {profileOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      D J Impex Admin
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      Signed-in administrator
                    </p>
                  </div>

                  <div className="pt-1.5 space-y-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileOpen(false);
                        setPasswordModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <KeyRound size={15} aria-hidden="true" className="text-[#52968e]" />
                      <span>Change password</span>
                    </button>

                    <form action={logoutAdminAction}>
                      <button
                        type="submit"
                        role="menuitem"
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 transition cursor-pointer"
                      >
                        <LogOut size={15} aria-hidden="true" />
                        <span>Sign out</span>
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>

      {/* Change Password Modal for logged in admins */}
      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
}

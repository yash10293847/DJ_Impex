import { headers } from "next/headers";
import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin",
  // Internal tooling. It must never appear in a search result, whatever else
  // robots.txt says.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Applies the stored theme before the browser paints, so the panel does not
 * flash white on the way to dark. It has to be inline and synchronous to run
 * that early, and it touches nothing but one class name on <html>.
 */
const THEME_SCRIPT = `try{if(localStorage.getItem("nabeen-admin-theme")==="dark"){document.documentElement.classList.add("admin-dark")}}catch(e){}`;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <>
      <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <AdminShell>{children}</AdminShell>
    </>
  );
}

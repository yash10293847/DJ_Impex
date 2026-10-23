import { headers } from "next/headers";
import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

import { TranslationProvider } from "@/components/ui/TranslationProvider";
import { DEFAULT_KEYWORDS, pageTitle, SITE_URL } from "@/lib/seo";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: pageTitle("House Of Luxury Men's Fabrics"),
    template: "%s | Nabeen® Luxury Fabrics by DJI",
  },
  description:
    "Nabeen®, the luxury fabric brand of D J Impex & Co. (Govt. of India recognized Star Export House). Woven in India since 1995 and exported to Africa and the Middle East. Over 1000 designs.",
  applicationName: "Nabeen®",
  authors: [{ name: "D J Impex & Co." }],
  creator: "D J Impex & Co.",
  publisher: "D J Impex & Co.",
  keywords: DEFAULT_KEYWORDS,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    siteName: "Nabeen® Luxury Fabrics by DJI",
    locale: "en_NG",
    alternateLocale: ["en_IN", "en_US", "en_GB"],
    type: "website",
    url: SITE_URL,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Nabeen®: luxury fabrics by D J Impex & Co.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@nabeen.ng",
    creator: "@nabeen.ng",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#172850",
  colorScheme: "light",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const isAdmin = requestHeaders.get("x-site-pathname")?.startsWith("/admin");
  return (
    // The font variable must live on <html>: tokens.css resolves --font-sans at :root,
    // so --font-open-sans has to be defined there or the whole value is invalid.
    <html lang="en" className={openSans.variable}>
      <body className="font-sans">
        {/* The marketing chrome lives in (site)/layout.tsx, not here, so that
            /admin can render without a header, footer or preloader. */}
        {!isAdmin && <TranslationProvider nonce={nonce} />}
        {children}

        {!isAdmin && <Analytics />}
      </body>
    </html>
  );
}

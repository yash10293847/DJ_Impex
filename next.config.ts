import type { NextConfig } from "next";
import { baselineHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  // CLAUDE.md here is the client brief, not a generated file.
  agentRules: false,
  // A stray package-lock.json sits above this folder; pin the root to this project.
  turbopack: { root: __dirname },
  // The overlay sits exactly where the floating actions do; it hides review screenshots.
  devIndicators: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Next 16 only serves qualities declared here. 88 is the hero and page-hero
    // photography; 75 is the default for everything else.
    qualities: [75, 88],
  },
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "64kb" } },
  async headers() {
    return [{ source: "/:path*", headers: Object.entries(baselineHeaders).map(([key, value]) => ({ key, value })) }];
  },
  async redirects() {
    return [
      // /contact was a real page until 2026-09-23, when the enquiry form moved
      // onto the home page. Anyone holding the old link -- a bookmark, a shared
      // URL, the client's own email signature -- lands on the form instead of a
      // 404. Temporary, not permanent: this structure has changed twice today
      // and a 308 is cached by the browser until the end of time.
      { source: "/contact", destination: "/#contact", permanent: false },
      { source: "/vision", destination: "/about", permanent: false },
    ];
  },
};

export default nextConfig;

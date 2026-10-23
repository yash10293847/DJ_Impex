/** Style attributes are required by the existing animation and translation UI.
 * Scripts require nonces; inline styles do not relax script execution policy. */
export function contentSecurityPolicy(nonce: string, development: boolean, admin = false): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://translate.googleapis.com https://www.gstatic.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.googleusercontent.com",
    "media-src 'self' blob:",
    `connect-src 'self'${admin ? "" : " https://translate.google.com https://translate.googleapis.com https://*.googleapis.com https://*.gstatic.com https://*.googleusercontent.com https://vitals.vercel-insights.com"}${development ? " ws: http://localhost:*" : ""}`,
    "frame-src https://www.google.com https://maps.google.com https://translate.google.com",
    "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export const baselineHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
};

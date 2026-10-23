import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName, verifySessionToken } from "@/lib/security/session";
import { baselineHeaders, contentSecurityPolicy } from "@/lib/security/headers";
import { securityEvent } from "@/lib/security/errors";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const admin = pathname === "/admin" || pathname.startsWith("/admin/");
  const api = pathname.startsWith("/api/admin/");
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV !== "production", admin);
  const forwarded = new Headers(request.headers);
  // Overwrite caller-supplied values before components use them.
  forwarded.set("x-nonce", nonce);
  forwarded.set("x-site-pathname", pathname);
  forwarded.set("Content-Security-Policy", csp);
  let response;
  try {
    if ((admin && pathname !== "/admin/login") || api) {
      const session = await verifySessionToken(request.cookies.get(sessionCookieName())?.value);
      if (!session) {
        response = api ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
          : NextResponse.redirect(new URL("/admin/login", request.url));
      }
    }
    response ??= NextResponse.next({ request: { headers: forwarded } });
  } catch {
    securityEvent("proxy_security_unavailable");
    response = NextResponse.json({ error: "Temporarily unavailable." }, { status: 503 });
  }
  response.headers.set("Content-Security-Policy", csp);
  for (const [key, value] of Object.entries(baselineHeaders)) response.headers.set(key, value);
  if (admin || api) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|images/|video/|media/|uploads/).*)"] };

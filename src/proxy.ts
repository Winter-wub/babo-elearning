import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

/**
 * Next.js 16 Proxy (formerly Middleware) using the edge-compatible auth config.
 * The `authorized` callback in authConfig handles all route protection logic.
 *
 * This file MUST NOT import Node-only modules (Prisma, bcryptjs) — it runs on
 * the Edge Runtime.
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const url = req.nextUrl;

  // Extract hostname from headers
  const hostname = req.headers.get("host") || "";

  // Extract subdomain if it exists
  const isLocalhost = hostname.includes("localhost");
  // Assuming format like: subdomain.domain.com
  let subdomain = null;

  if (isLocalhost) {
    const parts = hostname.split(".");
    if (parts.length > 1 && parts[parts.length - 1].includes("localhost")) {
      subdomain = parts[0];
    }
  } else {
    // For production (e.g. tenant1.elearning.com -> tenant1)
    const parts = hostname.split(".");
    if (parts.length >= 3) {
      subdomain = parts[0];
    }
  }

  // Reserved subdomains that shouldn't trigger tenant routing
  const reservedSubdomains = ["www", "api", "admin", "app", "localhost"];

  // If there's a valid tenant subdomain
  if (subdomain && !reservedSubdomains.includes(subdomain)) {
    // Prevent double-rewriting if we're already on a rewritten path internally
    if (url.pathname.startsWith(`/${subdomain}`)) {
      return NextResponse.next();
    }

    // Special case for public static files
    if (url.pathname.startsWith('/_next') || url.pathname.includes('.')) {
        return NextResponse.next();
    }

    // Rewrite to /[tenantSlug]/path
    return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}${url.search}`, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  — static build assets
     * - _next/image   — image optimisation service
     * - favicon.ico / public — static public assets
     * - api/auth      — NextAuth internal handlers (must be public)
     * - api/videos    — Video API routes handle their own auth and return
     *                   JSON 401/403. If the middleware intercepted them it
     *                   would issue an HTML redirect to /login, which breaks
     *                   the JSON fetch in the browser-side video player.
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api/auth|api/videos).*)",
  ],
};

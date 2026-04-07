import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * Next.js 16 Proxy (formerly Middleware) using the edge-compatible auth config.
 * The `authorized` callback in authConfig handles all route protection logic.
 *
 * This file MUST NOT import Node-only modules (Prisma, bcryptjs) — it runs on
 * the Edge Runtime.
 */
export default NextAuth(authConfig).auth;

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

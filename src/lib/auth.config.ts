/**
 * Auth.js edge-compatible configuration.
 *
 * This file must NOT import Node-only modules (e.g. bcryptjs, Prisma) because
 * it is also consumed by the middleware which runs on the Edge Runtime.
 * Password verification is intentionally omitted here and handled in auth.ts.
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    /**
     * Controls whether a request is allowed to proceed.
     * Used in middleware to enforce route-level access control.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const { pathname } = nextUrl;

      // ── Admin routes ────────────────────────────────────────────────────
      // Only ADMIN users may access /admin/*. Any other authenticated user
      // (i.e. a STUDENT) is redirected to their own dashboard so they don't
      // land on the login page with a confusing "not authorised" state.
      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false; // → redirects to /login
        if (role === "ADMIN") return true;
        // Authenticated non-admin: send them to the student dashboard.
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // ── Student routes ──────────────────────────────────────────────────
      // /dashboard and /videos/* require any authenticated user.
      // Admins are also allowed here (they can preview as a student would).
      const isStudentRoute =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/videos") ||
        pathname.startsWith("/orders") ||
        pathname.startsWith("/checkout") ||
        pathname.startsWith("/cart") ||
        pathname.startsWith("/profile");
      if (isStudentRoute) {
        return isLoggedIn; // unauthenticated → redirects to /login
      }

      // ── Auth pages ──────────────────────────────────────────────────────
      // Redirect already-authenticated users away from auth flows. Includes
      // /forgot-password and /reset-password because a signed-in attacker
      // (stolen session) must not be able to turn session theft into a
      // password reset and thus full account takeover.
      const isAuthPage =
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/reset-password");
      if (isAuthPage && isLoggedIn) {
        const redirectTo =
          role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
        return Response.redirect(new URL(redirectTo, nextUrl));
      }

      // Allow everything else (public pages, static assets not caught by the
      // matcher, /api/videos/* which handle their own auth internally, etc.)
      return true;
    },

    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Default to STUDENT for new OAuth users where role may be undefined
        token.role = user.role ?? "STUDENT";
        token.tokenVersion = user.tokenVersion ?? 0;
      }
      return token;
    },

    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "STUDENT" | "ADMIN";
      }
      return session;
    },
  },

  providers: [], // Populated in auth.ts with credentials provider
};

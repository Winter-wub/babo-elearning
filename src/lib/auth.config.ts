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

      // Cross-deployment token guard: reject JWTs issued for a different tenant.
      // SUPER_ADMIN is exempt — they can switch tenant context via the switcher.
      const deploymentTenantId = process.env.TENANT_ID;
      if (
        deploymentTenantId &&
        isLoggedIn &&
        role !== "SUPER_ADMIN" &&
        auth?.user?.activeTenantId &&
        auth.user.activeTenantId !== deploymentTenantId
      ) {
        // Token belongs to a different deployment — force re-login
        return false;
      }

      // ── Admin routes ────────────────────────────────────────────────────
      // Only ADMIN users may access /admin/*. Any other authenticated user
      // (i.e. a STUDENT) is redirected to their own dashboard so they don't
      // land on the login page with a confusing "not authorised" state.
      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false; // → redirects to /login
        if (role === "ADMIN" || role === "SUPER_ADMIN" || auth?.user?.tenantRole === "OWNER" || auth?.user?.tenantRole === "ADMIN") return true;
        // Authenticated non-admin: send them to the student dashboard.
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // ── Student routes ──────────────────────────────────────────────────
      // /dashboard and /videos/* require any authenticated user.
      // Admins are also allowed here (they can preview as a student would).
      const isStudentRoute =
        pathname.startsWith("/dashboard") || pathname.startsWith("/videos");
      if (isStudentRoute) {
        return isLoggedIn; // unauthenticated → redirects to /login
      }

      // ── Auth pages ──────────────────────────────────────────────────────
      // Redirect already-authenticated users away from /login and /register.
      const isAuthPage =
        pathname.startsWith("/login") || pathname.startsWith("/register");
      if (isAuthPage && isLoggedIn) {
        const redirectTo =
          (role === "ADMIN" || role === "SUPER_ADMIN" || auth?.user?.tenantRole === "OWNER" || auth?.user?.tenantRole === "ADMIN") ? "/admin/dashboard" : "/dashboard";
        return Response.redirect(new URL(redirectTo, nextUrl));
      }

      // Allow everything else (public pages, static assets not caught by the
      // matcher, /api/videos/* which handle their own auth internally, etc.)
      return true;
    },

    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        // Default to STUDENT for new OAuth users where role may be undefined
        token.role = user.role ?? "STUDENT";

        // Add multi-tenant fields from the user object returned by authorize
        if (user.activeTenantId) {
          token.activeTenantId = user.activeTenantId;
          token.tenantRole = user.tenantRole;
        }
      }

      // Handle session updates (e.g. SUPER_ADMIN switching active tenant).
      // Only SUPER_ADMIN can change activeTenantId via session update.
      if (trigger === "update" && session?.activeTenantId && token.role === "SUPER_ADMIN") {
        token.activeTenantId = session.activeTenantId;
        token.tenantRole = session.tenantRole;
      }

      return token;
    },

    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "STUDENT" | "ADMIN" | "SUPER_ADMIN";

        // Pass multi-tenant fields to the client session
        if (token.activeTenantId) {
          session.user.activeTenantId = token.activeTenantId as string;
          session.user.tenantRole = token.tenantRole as any;
        }
      }
      return session;
    },
  },

  providers: [], // Populated in auth.ts with credentials provider
};

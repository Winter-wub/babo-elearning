import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: "Sign In",
    template: `%s | ${APP_NAME}`,
  },
};

/**
 * Auth layout -- vertically and horizontally centered single-column card layout.
 * Used by /login and /register.
 *
 * A subtle dot-grid background adds visual depth without being distracting.
 * The brand name anchors the top of the card area, reinforcing identity.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 py-12">
      {/* Decorative gradient accent at top of viewport */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/5 to-transparent"
      />

      <div className="relative w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {APP_NAME}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Secure video learning platform
          </p>
        </div>

        {/* Page content (LoginForm or RegisterForm) */}
        {children}
      </div>
    </div>
  );
}

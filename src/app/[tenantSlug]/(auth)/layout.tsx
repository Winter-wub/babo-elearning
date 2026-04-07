import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { getAppName } from "@/lib/app-config";

export const metadata: Metadata = {
  title: {
    default: "เข้าสู่ระบบ",
    template: `%s | ${APP_NAME}`,
  },
};

/**
 * Auth layout -- vertically and horizontally centered single-column card layout.
 * Used by /login and /register.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appName = await getAppName();

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
            {appName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            แพลตฟอร์มเรียนรู้วิดีโอที่ปลอดภัย
          </p>
        </div>

        {/* Page content (LoginForm or RegisterForm) */}
        {children}
      </div>
    </div>
  );
}

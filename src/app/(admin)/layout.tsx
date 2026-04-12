import type { Metadata } from "next";
import { SessionProvider } from "@/components/providers/session-provider";
import { AdminShell } from "@/components/layout/admin-shell";
import { getAppName } from "@/lib/app-config";
import { getThemeSettings } from "@/actions/theme.actions";

export const metadata: Metadata = {
  title: {
    default: "แอดมิน",
    template: "%s | แอดมิน",
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [appName, themeSettings] = await Promise.all([
    getAppName(),
    getThemeSettings(),
  ]);

  return (
    <SessionProvider>
      <AdminShell appName={appName} logoUrl={themeSettings.logoSignedUrl || undefined}>
        {children}
      </AdminShell>
    </SessionProvider>
  );
}

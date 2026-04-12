import { StudentShell } from "@/components/layout/student-shell";
import { SessionProvider } from "@/components/providers/session-provider";
import { getAppName } from "@/lib/app-config";
import { getThemeSettings } from "@/actions/theme.actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "แดชบอร์ด",
    template: "%s | E-Learning",
  },
};

export default async function StudentLayout({
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
      <StudentShell appName={appName} logoUrl={themeSettings.logoSignedUrl || undefined}>
        {children}
      </StudentShell>
    </SessionProvider>
  );
}

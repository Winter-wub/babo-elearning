import { StudentShell } from "@/components/layout/student-shell";
import { SessionProvider } from "@/components/providers/session-provider";
import { getAppName } from "@/lib/app-config";
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
  const appName = await getAppName();

  return (
    <SessionProvider>
      <StudentShell appName={appName}>{children}</StudentShell>
    </SessionProvider>
  );
}

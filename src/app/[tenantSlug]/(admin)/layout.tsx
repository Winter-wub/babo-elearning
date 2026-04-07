import type { Metadata } from "next";
import { SessionProvider } from "@/components/providers/session-provider";
import { AdminShell } from "@/components/layout/admin-shell";
import { getAppName } from "@/lib/app-config";

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
  const appName = await getAppName();

  return (
    <SessionProvider>
      <AdminShell appName={appName}>{children}</AdminShell>
    </SessionProvider>
  );
}

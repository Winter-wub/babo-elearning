import type { Metadata } from "next";
import { SessionProvider } from "@/components/providers/session-provider";
import { AdminShell } from "@/components/layout/admin-shell";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s | Admin",
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}

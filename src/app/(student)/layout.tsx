import type { Metadata } from "next";
import { SessionProvider } from "@/components/providers/session-provider";
import { StudentShell } from "@/components/layout/student-shell";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | E-Learning",
  },
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <StudentShell>{children}</StudentShell>
    </SessionProvider>
  );
}

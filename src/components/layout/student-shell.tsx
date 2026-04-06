"use client";

import { useCallback, useState } from "react";
import { StudentSidebar } from "@/components/layout/student-sidebar";
import { Header } from "@/components/layout/header";

interface StudentShellProps {
  children: React.ReactNode;
  appName?: string;
}

/**
 * Client shell that combines the student sidebar + header with mobile toggle state.
 * Rendered inside the server-component student layout.
 */
export function StudentShell({ children, appName }: StudentShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleClose = useCallback(() => setSidebarOpen(false), []);
  const handleToggle = useCallback(() => setSidebarOpen((prev) => !prev), []);

  return (
    <div className="min-h-screen bg-muted/30">
      <StudentSidebar open={sidebarOpen} onClose={handleClose} appName={appName} />

      {/* Main content area: offset by sidebar width on desktop */}
      <div className="lg:pl-64">
        <Header onMenuClick={handleToggle} />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

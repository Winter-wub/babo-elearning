"use client";

import { useCallback, useState } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Header } from "@/components/layout/header";

interface AdminShellProps {
  children: React.ReactNode;
  appName?: string;
  logoUrl?: string;
}

/**
 * Client shell that combines the sidebar + header with mobile toggle state.
 * Rendered inside the server-component admin layout.
 */
export function AdminShell({ children, appName, logoUrl }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleClose = useCallback(() => setSidebarOpen(false), []);
  const handleToggle = useCallback(() => setSidebarOpen((prev) => !prev), []);

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminSidebar open={sidebarOpen} onClose={handleClose} appName={appName} logoUrl={logoUrl} />

      {/* Main content area: offset by sidebar width on desktop */}
      <div className="lg:pl-64">
        <Header onMenuClick={handleToggle} />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

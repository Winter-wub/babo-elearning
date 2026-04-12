"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Video, X, GraduationCap, UserCircle, ListVideo } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: "แดชบอร์ด", href: "/dashboard", icon: LayoutDashboard },
  { label: "วิดีโอของฉัน", href: "/videos", icon: Video },
  { label: "เพลย์ลิสต์", href: "/playlists", icon: ListVideo },
  { label: "โปรไฟล์ของฉัน", href: "/profile", icon: UserCircle },
];

interface StudentSidebarProps {
  open: boolean;
  onClose: () => void;
  appName?: string;
  logoUrl?: string;
}

export function StudentSidebar({ open, onClose, appName = "อีเลิร์นนิง", logoUrl }: StudentSidebarProps) {
  const pathname = usePathname();

  /** Close sidebar on route change (mobile) */
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /** Close on Escape key */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, onClose]);

  const isActive = useCallback(
    (href: string) => {
      if (href === "/dashboard") {
        return pathname === "/dashboard";
      }
      return pathname.startsWith(href);
    },
    [pathname]
  );

  return (
    <>
      {/* Mobile backdrop overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        role="navigation"
        aria-label="Student navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-background transition-transform duration-200 ease-in-out lg:translate-x-0 lg:transition-none",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-foreground"
          >
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-7 w-auto" />
            ) : (
              <GraduationCap className="h-6 w-6 text-indigo-600" />
            )}
            <span className="text-base font-semibold tracking-tight">
              {appName}
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden"
            aria-label="ปิดเมนู"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    active ? "text-indigo-600" : ""
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-border px-6 py-4">
          <p className="text-xs text-muted-foreground">พอร์ทัลนักเรียน</p>
        </div>
      </aside>
    </>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Video,
  X,
  GraduationCap,
  BarChart3,
  Shield,
  ListVideo,
  HelpCircle,
  FileText,
  Mail,
  Palette,
  LogIn,
  Link2,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "แดชบอร์ด", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "ผู้ใช้", href: "/admin/users", icon: Users },
  { label: "วิดีโอ", href: "/admin/videos?isActive=true", icon: Video },
  { label: "เพลย์ลิสต์", href: "/admin/playlists", icon: ListVideo },
  { label: "สิทธิ์การเข้าถึง", href: "/admin/permissions", icon: Shield },
  { label: "ลิงก์เชิญ", href: "/admin/invite-links", icon: Link2 },
  { label: "ผู้ให้บริการล็อกอิน", href: "/admin/oauth", icon: LogIn },
  { label: "คำถามที่พบบ่อย", href: "/admin/faq", icon: HelpCircle },
  { label: "เนื้อหา", href: "/admin/content", icon: FileText },
  { label: "ตั้งค่าธีม", href: "/admin/theme", icon: Palette },
  { label: "ข้อความติดต่อ", href: "/admin/contacts", icon: Mail },
  { label: "วิเคราะห์", href: "/admin/analytics", icon: BarChart3 },
  ...(process.env.NEXT_PUBLIC_AI_CHAT_ENABLED === "true"
    ? [{ label: "AI Chat", href: "/admin/ai-chat", icon: Bot, badge: "Beta" }]
    : []),
];

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
  appName?: string;
  logoUrl?: string;
}

export function AdminSidebar({ open, onClose, appName = "อีเลิร์นนิง", logoUrl }: AdminSidebarProps) {
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

  /** Determine if a nav item is active based on the current pathname */
  const isActive = useCallback(
    (href: string) => {
      const hrefPath = href.split("?")[0];
      if (hrefPath === "/admin/dashboard") {
        return pathname === "/admin/dashboard";
      }
      return pathname.startsWith(hrefPath);
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
        aria-label="Admin navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar-background text-sidebar-foreground transition-transform duration-200 ease-in-out lg:translate-x-0 lg:transition-none",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 text-sidebar-foreground"
          >
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-7 w-auto" />
            ) : (
              <GraduationCap className="h-6 w-6 text-sidebar-primary" />
            )}
            <span className="text-base font-semibold tracking-tight">
              {appName} แอดมิน
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation links */}
        <nav data-tour="sidebar-nav" className="flex-1 space-y-1 px-3 py-4">
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
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
                {item.badge && (
                  <span className="ml-auto rounded-md border border-amber-600/40 bg-amber-50 px-1.5 py-0 text-[10px] font-semibold text-amber-600 dark:border-amber-400/30 dark:bg-amber-950/20 dark:text-amber-400">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-sidebar-border px-6 py-4">
          <p className="text-xs text-sidebar-foreground/40">แผงควบคุมผู้ดูแลระบบ</p>
        </div>
      </aside>
    </>
  );
}

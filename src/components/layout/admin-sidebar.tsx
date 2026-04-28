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
  BookOpen,
  Mail,
  Palette,
  LogIn,
  Link2,
  Bot,
  ScrollText,
  Package,
  ShoppingCart,
  Receipt,
  CreditCard,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getPendingOrderCount } from "@/actions/order.actions";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

// Define grouped navigation items
const GROUPED_NAV_ITEMS = [
  {
    group: "ภาพรวม",
    items: [
      { label: "แดชบอร์ด", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "วิเคราะห์", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    group: "เนื้อหา",
    items: [
      { label: "วิดีโอ", href: "/admin/videos?isActive=true", icon: Video },
      { label: "เพลย์ลิสต์", href: "/admin/playlists", icon: ListVideo },
      { label: "บล็อก", href: "/admin/blog", icon: BookOpen },
      { label: "คำถามที่พบบ่อย", href: "/admin/faq", icon: HelpCircle },
      { label: "เนื้อหา", href: "/admin/content", icon: FileText },
      { label: "ตั้งค่าธีม", href: "/admin/theme", icon: Palette },
    ],
  },
  {
    group: "ผู้ใช้",
    items: [
      { label: "ผู้ใช้", href: "/admin/users", icon: Users },
      { label: "สิทธิ์การเข้าถึง", href: "/admin/permissions", icon: Shield },
      { label: "ลิงก์เชิญ", href: "/admin/invite-links", icon: Link2 },
      { label: "ผู้ให้บริการล็อกอิน", href: "/admin/oauth", icon: LogIn },
    ],
  },
  {
    group: "พาณิชย์",
    items: [
      { label: "สินค้า", href: "/admin/products", icon: Package },
      { label: "ตะกร้าสินค้า", href: "/admin/carts", icon: ShoppingCart },
      { label: "คำสั่งซื้อ", href: "/admin/orders", icon: Receipt },
      { label: "ช่องทางชำระเงิน", href: "/admin/payment-methods", icon: CreditCard },
    ],
  },
  {
    group: "ระบบ",
    items: [
      { label: "บันทึกการดำเนินการ", href: "/admin/audit-logs", icon: ScrollText },
      ...(process.env.NEXT_PUBLIC_AI_CHAT_ENABLED === "true"
        ? [{ label: "AI Chat", href: "/admin/ai-chat", icon: Bot, badge: "Beta" }]
        : []),
    ],
  },
];

// Define initial expanded state for each group
const INITIAL_GROUP_STATES = GROUPED_NAV_ITEMS.reduce((acc, group, index) => {
  acc[group.group] = true; // Default all groups to expanded
  return acc;
}, {} as Record<string, boolean>);

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
  appName?: string;
  logoUrl?: string;
}

export function AdminSidebar({ open, onClose, appName = "อีเลิร์นนิง", logoUrl }: AdminSidebarProps) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [groupStates, setGroupStates] = useState(INITIAL_GROUP_STATES);

  useEffect(() => {
    getPendingOrderCount().then(setPendingCount);
    const interval = setInterval(() => getPendingOrderCount().then(setPendingCount), 60000);
    return () => clearInterval(interval);
  }, []);

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

  /** Toggle a group's expanded state */
  const toggleGroup = (groupName: string) => {
    setGroupStates(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

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

  /** Auto-expand group if it contains the active route */
  useEffect(() => {
    GROUPED_NAV_ITEMS.forEach(group => {
      const hasActiveItem = group.items.some(item => isActive(item.href));
      if (hasActiveItem && !groupStates[group.group]) {
        setGroupStates(prev => ({
          ...prev,
          [group.group]: true
        }));
      }
    });
  }, [pathname, groupStates, isActive]);

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
        <nav data-tour="sidebar-nav" className="flex-1 overflow-y-auto space-y-1 px-3 py-4">
          {GROUPED_NAV_ITEMS.map((group) => {
            const isExpanded = groupStates[group.group];
            const hasActiveItem = group.items.some(item => isActive(item.href));

            return (
              <div key={group.group}>
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.group)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                    hasActiveItem
                      ? "text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )}
                  aria-expanded={isExpanded}
                  aria-controls={`group-${group.group}`}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                  <span>{group.group}</span>
                </button>

                {/* Collapsible Items */}
                {isExpanded && (
                  <div id={`group-${group.group}`} className="mt-1 space-y-1">
                    {group.items.map((item) => {
                      const active = isActive(item.href);
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 pl-8 text-sm font-medium transition-colors",
                            active
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                          )}
                          aria-current={active ? "page" : undefined}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          {item.label}
                          {item.href === "/admin/orders" && pendingCount > 0 && (
                            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                              {pendingCount > 9 ? "9+" : pendingCount}
                            </span>
                          )}
                          {item.badge && (
                            <span className="ml-auto rounded-md border border-amber-600/40 bg-amber-50 px-1.5 py-0 text-[10px] font-semibold text-amber-600 dark:border-amber-400/30 dark:bg-amber-950/20 dark:text-amber-400">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Divider between groups (except after the last group) */}
                {GROUPED_NAV_ITEMS.indexOf(group) !== GROUPED_NAV_ITEMS.length - 1 && (
                  <div className="my-2 border-t border-sidebar-border" />
                )}
              </div>
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

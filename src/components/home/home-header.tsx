"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/theme-toggle";

interface HomeHeaderProps {
  isAuthenticated: boolean;
  userRole?: "ADMIN" | "STUDENT";
  userName?: string;
  appName?: string;
  logoUrl?: string;
}

interface NavItem {
  label: string;
  href: string;
}

// Static nav links displayed in the center of the header
const NAV_ITEMS: NavItem[] = [
  { label: "หน้าแรก", href: "/" },
  { label: "บทความ", href: "/blog" },
  { label: "เกี่ยวกับเรา", href: "/about" },
  { label: "คำถามที่พบบ่อย", href: "/faq" },
];

export function HomeHeader({
  isAuthenticated,
  userRole,
  userName,
  appName = "อีเลิร์นนิง",
  logoUrl,
}: HomeHeaderProps) {
  const pathname = usePathname();
  const dashboardHref = userRole === "ADMIN" ? "/admin/dashboard" : "/dashboard";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* ── Brand logo ─────────────────────────────────────────────── */}
        <Link
          href="/"
          className="flex items-center gap-2 text-foreground transition-colors hover:text-foreground/80"
        >
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="h-8 w-auto" />
          ) : (
            <GraduationCap className="h-6 w-6" aria-hidden="true" />
          )}
          <span className="text-lg font-semibold tracking-tight">{appName}</span>
        </Link>

        {/* ── Desktop center nav ──────────────────────────────────────── */}
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="เมนูหลัก"
        >
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.label}
              variant="ghost"
              size="sm"
              asChild
            >
              <Link
                href={item.href}
                className={cn(
                  pathname === item.href && "font-semibold text-foreground"
                )}
                aria-current={pathname === item.href ? "page" : undefined}
              >
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>

        {/* ── Desktop auth actions ─────────────────────────────────────── */}
        <div className="hidden items-center gap-2 md:flex" aria-label="การดำเนินการผู้ใช้">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href={dashboardHref}>แดชบอร์ด</Link>
              </Button>
              <Link
                href={dashboardHref}
                aria-label={`${userName ?? "User"} profile`}
              >
                <Avatar size="sm" fallback={userName ?? "User"} />
              </Link>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">เข้าสู่ระบบ</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">สมัครสมาชิก</Link>
              </Button>
            </>
          )}
        </div>

        {/* ── Mobile hamburger + Sheet drawer ──────────────────────────── */}
        <div className="flex items-center gap-1 md:hidden">
        <ThemeToggle />
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              aria-label="เปิดเมนูนำทาง"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>

          {/* Side = left — slides in from the left edge */}
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>
                <Link
                  href="/"
                  className="flex items-center gap-2 text-foreground"
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt={appName} className="h-6 w-auto" />
                  ) : (
                    <GraduationCap className="h-5 w-5" aria-hidden="true" />
                  )}
                  {appName}
                </Link>
              </SheetTitle>
            </SheetHeader>

            {/* Mobile nav links */}
            <nav className="mt-4 flex flex-col gap-1" aria-label="เมนูมือถือ">
              {NAV_ITEMS.map((item) => (
                <SheetClose key={item.label} asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "rounded-md px-3 py-3 text-sm font-medium transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      pathname === item.href
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground"
                    )}
                    aria-current={pathname === item.href ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </SheetClose>
              ))}

            </nav>

            {/* Mobile auth actions — pushed to the bottom */}
            <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-border">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <Avatar size="sm" fallback={userName ?? "User"} />
                    <span className="text-sm font-medium text-foreground">
                      {userName ?? "User"}
                    </span>
                  </div>
                  <SheetClose asChild>
                    <Button asChild>
                      <Link href={dashboardHref}>ไปที่แดชบอร์ด</Link>
                    </Button>
                  </SheetClose>
                </>
              ) : (
                <>
                  <SheetClose asChild>
                    <Button variant="outline" asChild>
                      <Link href="/login">เข้าสู่ระบบ</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild>
                      <Link href="/register">สมัครสมาชิก</Link>
                    </Button>
                  </SheetClose>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
        </div>

      </div>
    </header>
  );
}

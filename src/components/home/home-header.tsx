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
import { NavCoursesDropdown } from "./nav-courses-dropdown";
import { cn } from "@/lib/utils";

interface HomeHeaderProps {
  isAuthenticated: boolean;
  userRole?: "ADMIN" | "STUDENT";
  userName?: string;
}

interface NavItem {
  label: string;
  href: string;
}

// Static nav links displayed in the center of the header
const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "#" },
  { label: "FAQ", href: "#" },
];

export function HomeHeader({
  isAuthenticated,
  userRole,
  userName,
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
          <GraduationCap className="h-6 w-6" aria-hidden="true" />
          <span className="text-lg font-semibold tracking-tight">E-Learning</span>
        </Link>

        {/* ── Desktop center nav ──────────────────────────────────────── */}
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Main navigation"
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
          {/* Courses gets its own dropdown */}
          <NavCoursesDropdown />
        </nav>

        {/* ── Desktop auth actions ─────────────────────────────────────── */}
        <div className="hidden items-center gap-2 md:flex" aria-label="User actions">
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href={dashboardHref}>Dashboard</Link>
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
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>

        {/* ── Mobile hamburger + Sheet drawer ──────────────────────────── */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation menu"
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
                  <GraduationCap className="h-5 w-5" aria-hidden="true" />
                  E-Learning
                </Link>
              </SheetTitle>
            </SheetHeader>

            {/* Mobile nav links */}
            <nav className="mt-4 flex flex-col gap-1" aria-label="Mobile navigation">
              {NAV_ITEMS.map((item) => (
                <SheetClose key={item.label} asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
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

              {/* Courses section in mobile drawer */}
              <div className="mt-2">
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Courses
                </p>
                {[
                  { label: "All Courses", href: "#" },
                  { label: "Finance", href: "#" },
                  { label: "Investment", href: "#" },
                  { label: "Tax Planning", href: "#" },
                ].map((item) => (
                  <SheetClose key={item.label} asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "block rounded-md px-3 py-2 text-sm transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "text-foreground"
                      )}
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </div>
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
                      <Link href={dashboardHref}>Go to Dashboard</Link>
                    </Button>
                  </SheetClose>
                </>
              ) : (
                <>
                  <SheetClose asChild>
                    <Button variant="outline" asChild>
                      <Link href="/login">Login</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild>
                      <Link href="/register">Register</Link>
                    </Button>
                  </SheetClose>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

      </div>
    </header>
  );
}

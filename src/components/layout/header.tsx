"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { HeaderHelpButton } from "@/components/layout/header-help-button";
import { CartIcon } from "@/components/cart/cart-icon";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();

  const userName = session?.user?.name ?? "User";
  const userEmail = session?.user?.email ?? "";
  const userRole = session?.user?.role;
  const isStudent = userRole === "STUDENT";
  const [cartOpen, setCartOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      {/* Left side: hamburger + public nav links */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
          aria-label="เปิดเมนูนำทาง"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {isStudent && (
          <nav className="hidden items-center gap-1 lg:flex" aria-label="เมนูสาธารณะ">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">หน้าแรก</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/courses">คอร์สเรียน</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/blog">บทความ</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/about">เกี่ยวกับเรา</Link>
            </Button>
          </nav>
        )}
      </div>

      {/* Right side: help + theme toggle + user menu */}
      <div className="flex items-center gap-1">
      <HeaderHelpButton />
      {isStudent && (
        <CartIcon onClick={() => setCartOpen(true)} />
      )}
      <div data-tour="header-theme-toggle">
        <ThemeToggle />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-2"
            aria-label="เมนูผู้ใช้"
            data-tour="header-user-menu"
          >
            <Avatar size="sm" fallback={userName} />
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-none">{userName}</p>
              <p className="text-xs text-muted-foreground">
                {userRole === "ADMIN" ? "ผู้ดูแลระบบ" : userRole === "STUDENT" ? "นักเรียน" : ""}
              </p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{userName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {userEmail}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <User className="mr-2 h-4 w-4" />
            โปรไฟล์
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            ออกจากระบบ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
      {isStudent && (
        <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      )}
    </header>
  );
}

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

interface HomeHeaderProps {
  isAuthenticated: boolean;
  userRole?: "ADMIN" | "STUDENT";
  userName?: string;
}

export function HomeHeader({
  isAuthenticated,
  userRole,
  userName,
}: HomeHeaderProps) {
  const dashboardHref =
    userRole === "ADMIN" ? "/admin/dashboard" : "/dashboard";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 text-foreground transition-colors hover:text-foreground/80"
        >
          <GraduationCap className="h-6 w-6" />
          <span className="text-lg font-semibold tracking-tight">
            E-Learning
          </span>
        </Link>

        {/* Navigation actions */}
        <nav className="flex items-center gap-2" aria-label="Main navigation">
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
        </nav>
      </div>
    </header>
  );
}

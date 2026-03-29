import type { Metadata } from "next";
import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Access Denied",
};

/**
 * 403 Unauthorized page — shown when an authenticated student navigates to a
 * video they do not have permission to view.
 *
 * Security note: This page is intentionally vague.  We do not confirm whether
 * the requested video exists; we only tell the student they lack access.  The
 * redirect here originates from the video page's server-side permission check,
 * so the video ID is never surfaced in this page's UI or URL.
 */
export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <ShieldOff className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Access Denied
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          You don&apos;t have permission to view this content. If you believe
          this is a mistake, please contact your administrator.
        </p>
      </div>

      <Button asChild>
        <Link href="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}

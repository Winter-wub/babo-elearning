import type { Metadata } from "next";
import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "ไม่มีสิทธิ์เข้าถึง",
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
          ไม่มีสิทธิ์เข้าถึง
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          คุณไม่มีสิทธิ์ดูเนื้อหานี้ หากคุณเชื่อว่านี่เป็นข้อผิดพลาด
          กรุณาติดต่อผู้ดูแลระบบ
        </p>
      </div>

      <Button asChild>
        <Link href="/dashboard">กลับไปที่แดชบอร์ด</Link>
      </Button>
    </div>
  );
}

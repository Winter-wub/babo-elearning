import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { verifyEmail } from "@/actions/email-verification.actions";

export const metadata: Metadata = {
  title: "ยืนยันอีเมล",
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

/**
 * Legacy email verification page — handles link-based tokens for existing users.
 * New registrations use OTP-based verification inline on the /register page.
 */
export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return <ErrorCard message="ลิงก์ไม่ถูกต้อง กรุณาตรวจสอบอีเมลของคุณอีกครั้ง" />;
  }

  const result = await verifyEmail(token);

  if (result.success) {
    redirect("/login?verified=1");
  }

  return <ErrorCard message={result.error} />;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ErrorCard({ message }: { message: string }) {
  return (
    <Card>
      <CardHeader className="items-center text-center gap-3 pb-2">
        <div className="rounded-full bg-red-50 p-3">
          <XCircle className="size-8 text-red-500" />
        </div>
        <CardTitle className="text-xl">ลิงก์ไม่ถูกต้องหรือหมดอายุ</CardTitle>
        <CardDescription className="text-center leading-relaxed">
          {message}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-2">
        <Button asChild className="w-full">
          <Link href="/register">ลงทะเบียนใหม่</Link>
        </Button>
        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
          >
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

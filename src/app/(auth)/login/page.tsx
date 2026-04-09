import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { getEnabledOAuthProviders } from "@/actions/oauth.actions";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
};

interface LoginPageProps {
  searchParams: Promise<{ verified?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [enabledProviders, params] = await Promise.all([
    getEnabledOAuthProviders(),
    searchParams,
  ]);

  const isJustVerified = params.verified === "1";

  return (
    <div className="flex flex-col gap-3">
      {/* Post-verification success banner */}
      {isJustVerified && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
          <p>
            <span className="font-medium">ยืนยันอีเมลสำเร็จ!</span>{" "}
            กรุณาเข้าสู่ระบบเพื่อเริ่มต้นใช้งาน
          </p>
        </div>
      )}

      <LoginForm enabledProviders={enabledProviders} />

      <p className="text-center text-sm text-muted-foreground">
        ยังไม่มีบัญชี?{" "}
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          สมัครสมาชิก
        </Link>
      </p>
    </div>
  );
}

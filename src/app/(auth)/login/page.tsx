import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { getEnabledOAuthProviders } from "@/actions/oauth.actions";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
};

export default async function LoginPage() {
  const enabledProviders = await getEnabledOAuthProviders();

  return (
    <>
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
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { getEnabledOAuthProviders } from "@/actions/oauth.actions";

export const metadata: Metadata = {
  title: "สร้างบัญชี",
};

export default async function RegisterPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const enabledProviders = await getEnabledOAuthProviders(tenantSlug);

  return (
    <>
      <RegisterForm enabledProviders={enabledProviders} />

      <p className="text-center text-sm text-muted-foreground">
        มีบัญชีอยู่แล้ว?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          เข้าสู่ระบบ
        </Link>
      </p>
    </>
  );
}

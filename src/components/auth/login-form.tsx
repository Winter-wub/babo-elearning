"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";

import { getEmailVerificationStatus } from "@/actions/auth.actions";
import { resendVerificationEmail } from "@/actions/email-verification.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import { SocialDivider } from "@/components/auth/social-divider";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().min(1, "กรุณากรอกอีเมล").email("กรุณากรอกอีเมลที่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Unverified email banner
// ---------------------------------------------------------------------------

function UnverifiedEmailBanner({ email }: { email: string }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleResend() {
    setSending(true);
    await resendVerificationEmail(email);
    setSending(false);
    setSent(true);
  }

  return (
    <div
      role="alert"
      className="flex gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <div className="flex flex-col gap-1">
        <p className="font-medium">บัญชีของคุณยังไม่ได้รับการยืนยัน</p>
        {sent ? (
          <p className="text-amber-700">ส่งอีเมลแล้ว กรุณาตรวจสอบกล่องจดหมาย</p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="w-fit text-left font-medium underline underline-offset-4 hover:text-amber-900 disabled:opacity-50 transition-colors"
          >
            {sending ? "กำลังส่ง…" : "ส่งอีเมลยืนยันอีกครั้ง"}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LoginFormProps {
  callbackUrl?: string;
  enabledProviders?: string[];
  verified?: boolean;
}

export function LoginForm({
  callbackUrl = "/dashboard",
  enabledProviders,
  verified = false,
}: LoginFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isEmailUnverified, setIsEmailUnverified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginFormValues) {
    setServerError(null);
    setIsEmailUnverified(false);

    try {
      // Check verification status before attempting sign-in so we can show a
      // helpful message instead of the generic "invalid credentials" error.
      const status = await getEmailVerificationStatus(data.email);
      if (status === "unverified") {
        setIsEmailUnverified(true);
        setUnverifiedEmail(data.email);
        return;
      }

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setServerError("อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง");
        return;
      }

      // Successful sign-in -- read the session to determine the user's role
      // and redirect to the appropriate dashboard.
      const session = await getSession();
      const destination =
        session?.user?.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
      router.push(destination);
      router.refresh();
    } catch {
      setServerError("เกิดข้อผิดพลาด กรุณาลองอีกครั้งภายหลัง");
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">เข้าสู่ระบบ</CardTitle>
        <CardDescription>
          กรอกข้อมูลเพื่อเข้าสู่ระบบ
        </CardDescription>
      </CardHeader>

      <CardContent>
        <SocialLoginButtons callbackUrl={callbackUrl} enabledProviders={enabledProviders} />
        {enabledProviders === undefined || enabledProviders.length > 0 ? <SocialDivider /> : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Email-not-verified amber banner */}
          {isEmailUnverified && (
            <UnverifiedEmailBanner email={unverifiedEmail} />
          )}

          {/* Generic server error banner */}
          {serverError && !isEmailUnverified && (
            <div
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {serverError}
            </div>
          )}

          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="login-email">อีเมล</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              error={!!errors.email}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="login-email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="login-password">รหัสผ่าน</Label>
            <Input
              id="login-password"
              type="password"
              placeholder="กรอกรหัสผ่าน"
              autoComplete="current-password"
              error={!!errors.password}
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
              {...register("password")}
            />
            {errors.password && (
              <p id="login-password-error" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="text-primary-foreground" />
                กำลังเข้าสู่ระบบ...
              </>
            ) : (
              "เข้าสู่ระบบ"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

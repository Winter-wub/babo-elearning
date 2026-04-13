"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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

    try {
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
          {/* Generic server error banner */}
          {serverError && (
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

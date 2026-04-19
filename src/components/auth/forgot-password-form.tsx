"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ArrowLeft } from "lucide-react";

import { requestPasswordReset } from "@/actions/password-reset.actions";
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

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const schema = z.object({
  email: z.string().min(1, "กรุณากรอกอีเมล").email("กรุณากรอกอีเมลที่ถูกต้อง"),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: FormValues) {
    setServerError(null);
    try {
      await requestPasswordReset({ email: data.email });
      // Always show success — never reveal whether an account exists
      setSubmitted(true);
    } catch {
      setServerError("เกิดข้อผิดพลาด กรุณาลองอีกครั้งภายหลัง");
    }
  }

  // ---- Success state ----
  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-4 py-4 text-center"
          >
            {/* Decorative circle icon */}
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>

            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">
                ตรวจสอบอีเมลของคุณ
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                หากมีบัญชีที่ตรงกับอีเมลนี้ เราได้ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว
                <br />
                ลิงก์จะหมดอายุใน 1 ชั่วโมง
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              ไม่เห็นอีเมล? ตรวจสอบโฟลเดอร์สแปม
            </p>
          </div>

          <div className="mt-4 border-t pt-4">
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Form state ----
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">ลืมรหัสผ่าน?</CardTitle>
        <CardDescription>
          กรอกอีเมลที่ลงทะเบียนไว้ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Server error banner */}
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
            <Label htmlFor="forgot-email">อีเมล</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              error={!!errors.email}
              aria-describedby={errors.email ? "forgot-email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="forgot-email-error" role="alert" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="text-primary-foreground" />
                กำลังส่ง...
              </>
            ) : (
              "ส่งลิงก์รีเซ็ตรหัสผ่าน"
            )}
          </Button>

          {/* Back link */}
          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

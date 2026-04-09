"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Clock, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { resendVerificationEmail } from "@/actions/email-verification.actions";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  email: z.string().min(1, "กรุณากรอกอีเมล").email("กรุณากรอกอีเมลที่ถูกต้อง"),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ResendVerificationPage() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
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

    const result = await resendVerificationEmail(data.email);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    setSentEmail(data.email.toLowerCase().trim());
    setSent(true);
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (sent) {
    return (
      <Card>
        <CardHeader className="items-center text-center gap-3 pb-2">
          <div className="rounded-full bg-muted p-3">
            <Mail className="size-8 text-foreground" />
          </div>
          <CardTitle className="text-xl">ตรวจสอบอีเมลของคุณ</CardTitle>
          <CardDescription className="text-center leading-relaxed">
            เราส่งลิงก์ยืนยันไปที่{" "}
            <span className="font-medium text-foreground">{sentEmail}</span>{" "}
            แล้ว กรุณาตรวจสอบอีเมลและคลิกลิงก์เพื่อยืนยันบัญชี
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-2">
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5 shrink-0" />
            <span>ลิงก์มีอายุ 24 ชั่วโมง</span>
          </div>
          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
            >
              ← กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Form state ─────────────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">ส่งลิงก์ยืนยันอีกครั้ง</CardTitle>
        <CardDescription>
          กรอกอีเมลที่ใช้ลงทะเบียน แล้วเราจะส่งลิงก์ยืนยันไปให้อีกครั้ง
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {/* Server error banner */}
          {serverError && (
            <div
              role="alert"
              className="flex gap-2.5 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <XCircle className="mt-0.5 size-4 shrink-0" />
              <p>{serverError}</p>
            </div>
          )}

          {/* Email field */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resend-email">อีเมล</Label>
            <Input
              id="resend-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              error={!!errors.email}
              aria-describedby={errors.email ? "resend-email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="resend-email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Submit button */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Spinner size="sm" className="mr-2 text-primary-foreground" />}
            ส่งลิงก์ยืนยัน
          </Button>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
            >
              ← กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

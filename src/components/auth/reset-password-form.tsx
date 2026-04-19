"use client";

import { useState, useEffect, forwardRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff, ArrowLeft, AlertCircle } from "lucide-react";

import { validateResetToken, resetPassword } from "@/actions/password-reset.actions";
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
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Password strength helpers (mirrors register-form.tsx conventions)
// ---------------------------------------------------------------------------

interface PasswordStrength {
  score: number; // 0–4
  label: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const normalized = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;

  const labels: Record<0 | 1 | 2 | 3 | 4, string> = {
    0: "",
    1: "อ่อน",
    2: "ปานกลาง",
    3: "ดี",
    4: "แข็งแรง",
  };

  return { score: normalized, label: labels[normalized] };
}

const strengthBarColors: Record<number, string> = {
  0: "bg-muted",
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-yellow-500",
  4: "bg-green-500",
};

const strengthTextColors: Record<number, string> = {
  0: "text-muted-foreground",
  1: "text-red-500",
  2: "text-orange-500",
  3: "text-yellow-500",
  4: "text-green-500",
};

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
      .max(128, "รหัสผ่านต้องไม่เกิน 128 ตัวอักษร")
      .regex(/[a-zA-Z]/, "รหัสผ่านต้องมีตัวอักษรอย่างน้อย 1 ตัว")
      .regex(/\d/, "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว"),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof resetSchema>;

// ---------------------------------------------------------------------------
// PasswordInput — field with show/hide toggle
// ---------------------------------------------------------------------------

interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  error?: boolean;
  ariaDescribedBy?: string;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInputInner(
    { id, error, ariaDescribedBy, ...rest },
    ref
  ) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        ref={ref}
        id={id}
        type={visible ? "text" : "password"}
        className="pr-10"
        error={error}
        aria-describedby={ariaDescribedBy}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
        aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        tabIndex={0}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
);

// ---------------------------------------------------------------------------
// Countdown for redirect after success
// ---------------------------------------------------------------------------

function useCountdown(seconds: number, active: boolean) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (!active) return;
    if (remaining <= 0) return;

    const timer = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [active, remaining]);

  return remaining;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// The token arrives via `window.location.hash` (`#t=...`) so that it never
// appears in server access logs, Referer headers, or browser analytics.
function readTokenFromHash(): string | null {
  if (typeof window === "undefined") return null;
  // Strip the leading "#"
  const raw = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  return params.get("t");
}

export function ResetPasswordForm() {
  const router = useRouter();

  // Token is read client-side from the URL fragment on mount
  const [token, setToken] = useState<string | null>(null);

  // Token validation state
  const [tokenState, setTokenState] = useState<
    "loading" | "valid" | "invalid"
  >("loading");

  // Form success state
  const [succeeded, setSucceeded] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Countdown that starts after success
  const countdown = useCountdown(3, succeeded);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const passwordValue = watch("password");
  const strength = getPasswordStrength(passwordValue);

  // Read the token from the URL fragment and validate it on mount.
  // Clear the fragment from the address bar immediately so a user sharing
  // their screen or walking away from the tab does not expose it.
  useEffect(() => {
    const t = readTokenFromHash();
    setToken(t);
    if (typeof window !== "undefined" && window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    if (!t) {
      setTokenState("invalid");
      return;
    }
    validateResetToken(t).then((result) => {
      setTokenState(result.valid ? "valid" : "invalid");
    });
  }, []);

  // Auto-redirect to login after success countdown reaches 0
  useEffect(() => {
    if (succeeded && countdown === 0) {
      router.push("/login");
    }
  }, [succeeded, countdown, router]);

  async function onSubmit(data: FormValues) {
    setServerError(null);
    if (!token) {
      setServerError("ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว");
      return;
    }
    try {
      const result = await resetPassword({ token, password: data.password });
      if (!result.success) {
        setServerError(result.error ?? "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
        return;
      }
      setSucceeded(true);
    } catch {
      setServerError("เกิดข้อผิดพลาด กรุณาลองอีกครั้งภายหลัง");
    }
  }

  // ---- Loading: validating token ----
  if (tokenState === "loading") {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  // ---- Invalid / expired token ----
  if (tokenState === "invalid") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div
            role="alert"
            className="flex flex-col items-center gap-4 py-4 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>

            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">
                ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ลิงก์รีเซ็ตรหัสผ่านใช้งานได้เพียง 1 ชั่วโมงหลังจากส่ง
                <br />
                กรุณาขอลิงก์ใหม่
              </p>
            </div>

            <Button asChild className="w-full max-w-xs">
              <Link href="/forgot-password">ขอลิงก์รีเซ็ตใหม่</Link>
            </Button>
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

  // ---- Success state ----
  if (succeeded) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-4 py-4 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>

            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">
                รหัสผ่านเปลี่ยนแล้ว
              </p>
              <p className="text-sm text-muted-foreground">
                กำลังพาคุณไปหน้าเข้าสู่ระบบใน{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {countdown}
                </span>{" "}
                วินาที
              </p>
            </div>

            <Button asChild variant="outline" className="w-full max-w-xs">
              <Link href="/login">เข้าสู่ระบบเลย</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Form state ----
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">ตั้งรหัสผ่านใหม่</CardTitle>
        <CardDescription>
          รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวอักษรและตัวเลข
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

          {/* New password field */}
          <div className="space-y-2">
            <Label htmlFor="reset-password">รหัสผ่านใหม่</Label>
            <PasswordInput
              id="reset-password"
              placeholder="สร้างรหัสผ่านใหม่"
              autoComplete="new-password"
              autoFocus
              error={!!errors.password}
              ariaDescribedBy={
                errors.password
                  ? "reset-password-error"
                  : passwordValue
                  ? "reset-password-strength"
                  : undefined
              }
              {...register("password")}
            />

            {/* Password strength indicator */}
            {passwordValue && (
              <div
                id="reset-password-strength"
                className="space-y-1.5"
                aria-live="polite"
                aria-atomic="true"
              >
                <div className="flex gap-1" role="presentation">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors duration-300",
                        strength.score >= level
                          ? strengthBarColors[strength.score]
                          : "bg-muted"
                      )}
                    />
                  ))}
                </div>
                {strength.label && (
                  <p
                    className={cn(
                      "text-xs transition-colors duration-300",
                      strengthTextColors[strength.score]
                    )}
                  >
                    ความแข็งแกร่ง: {strength.label}
                  </p>
                )}
              </div>
            )}

            {errors.password && (
              <p id="reset-password-error" role="alert" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm password field */}
          <div className="space-y-2">
            <Label htmlFor="reset-confirm-password">ยืนยันรหัสผ่านใหม่</Label>
            <PasswordInput
              id="reset-confirm-password"
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              autoComplete="new-password"
              error={!!errors.confirmPassword}
              ariaDescribedBy={
                errors.confirmPassword
                  ? "reset-confirm-password-error"
                  : undefined
              }
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p
                id="reset-confirm-password-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errors.confirmPassword.message}
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
                กำลังบันทึก...
              </>
            ) : (
              "บันทึกรหัสผ่านใหม่"
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { registerUser } from "@/actions/auth.actions";
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
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import { SocialDivider } from "@/components/auth/social-divider";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร")
      .max(100, "ชื่อต้องไม่เกิน 100 ตัวอักษร"),
    email: z.string().min(1, "กรุณากรอกอีเมล").email("กรุณากรอกอีเมลที่ถูกต้อง"),
    password: z
      .string()
      .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
      .max(128, "รหัสผ่านต้องไม่เกิน 128 ตัวอักษร"),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// ---------------------------------------------------------------------------
// Password strength helpers
// ---------------------------------------------------------------------------

interface PasswordStrength {
  score: number; // 0-4
  label: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "" };

  let score = 0;

  // Length contributions
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character variety contributions
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Normalize to 0-4 scale
  const normalized = Math.min(4, score);

  const labels: Record<number, string> = {
    0: "",
    1: "อ่อน",
    2: "ปานกลาง",
    3: "ดี",
    4: "แข็งแรง",
  };

  return { score: normalized, label: labels[normalized] ?? "" };
}

const strengthColors: Record<number, string> = {
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
// Component
// ---------------------------------------------------------------------------

interface RegisterFormProps {
  enabledProviders?: string[];
}

export function RegisterForm({ enabledProviders }: RegisterFormProps = {}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const passwordValue = watch("password");
  const strength = getPasswordStrength(passwordValue);

  async function onSubmit(data: RegisterFormValues) {
    setServerError(null);

    try {
      const result = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      // Auto-login after successful registration
      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Registration succeeded but auto-login failed -- send to login page
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setServerError("เกิดข้อผิดพลาด กรุณาลองอีกครั้งภายหลัง");
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">สร้างบัญชี</CardTitle>
        <CardDescription>
          กรอกข้อมูลเพื่อเริ่มต้นการเรียนรู้
        </CardDescription>
      </CardHeader>

      <CardContent>
        <SocialLoginButtons callbackUrl="/dashboard" enabledProviders={enabledProviders} />
        {enabledProviders === undefined || enabledProviders.length > 0 ? <SocialDivider /> : null}

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

          {/* Name field */}
          <div className="space-y-2">
            <Label htmlFor="register-name">ชื่อ-นามสกุล</Label>
            <Input
              id="register-name"
              type="text"
              placeholder="สมชาย ใจดี"
              autoComplete="name"
              autoFocus
              error={!!errors.name}
              aria-describedby={errors.name ? "register-name-error" : undefined}
              {...register("name")}
            />
            {errors.name && (
              <p id="register-name-error" className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="register-email">อีเมล</Label>
            <Input
              id="register-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={!!errors.email}
              aria-describedby={
                errors.email ? "register-email-error" : undefined
              }
              {...register("email")}
            />
            {errors.email && (
              <p id="register-email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="register-password">รหัสผ่าน</Label>
            <Input
              id="register-password"
              type="password"
              placeholder="สร้างรหัสผ่าน"
              autoComplete="new-password"
              error={!!errors.password}
              aria-describedby={
                errors.password
                  ? "register-password-error"
                  : "register-password-strength"
              }
              {...register("password")}
            />

            {/* Password strength indicator */}
            {passwordValue && (
              <div
                id="register-password-strength"
                className="space-y-1.5"
                aria-live="polite"
              >
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors duration-300",
                        strength.score >= level
                          ? strengthColors[strength.score]
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
                    {strength.label}
                  </p>
                )}
              </div>
            )}

            {errors.password && (
              <p
                id="register-password-error"
                className="text-sm text-destructive"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm password field */}
          <div className="space-y-2">
            <Label htmlFor="register-confirm-password">ยืนยันรหัสผ่าน</Label>
            <Input
              id="register-confirm-password"
              type="password"
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              autoComplete="new-password"
              error={!!errors.confirmPassword}
              aria-describedby={
                errors.confirmPassword
                  ? "register-confirm-password-error"
                  : undefined
              }
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p
                id="register-confirm-password-error"
                className="text-sm text-destructive"
              >
                {errors.confirmPassword.message}
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
                กำลังสร้างบัญชี...
              </>
            ) : (
              "สร้างบัญชี"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

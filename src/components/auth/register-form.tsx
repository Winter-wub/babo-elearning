"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ChevronLeft } from "lucide-react";

import { requestOtp, verifyOtp, completeRegistration } from "@/actions/otp.actions";
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
import { OTP_LENGTH, OTP_RESEND_COOLDOWN_MS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = "email" | "otp" | "complete";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const emailSchema = z.object({
  email: z.string().min(1, "กรุณากรอกอีเมล").email("กรุณากรอกอีเมลที่ถูกต้อง"),
});

const completeSchema = z
  .object({
    name: z
      .string()
      .min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร")
      .max(100, "ชื่อต้องไม่เกิน 100 ตัวอักษร"),
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

type EmailFormValues = z.infer<typeof emailSchema>;
type CompleteFormValues = z.infer<typeof completeSchema>;

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
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

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
// OTP Input Component
// ---------------------------------------------------------------------------

interface OtpInputProps {
  value: string[];
  onChange: (digits: string[]) => void;
  disabled?: boolean;
  error?: boolean;
}

function OtpInput({ value, onChange, disabled, error }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setRef = useCallback(
    (index: number) => (el: HTMLInputElement | null) => {
      inputRefs.current[index] = el;
    },
    []
  );

  function handleChange(index: number, char: string) {
    // Only allow digits
    if (char && !/^\d$/.test(char)) return;

    const newDigits = [...value];
    newDigits[index] = char;
    onChange(newDigits);

    // Auto-focus next input
    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      // Move focus back on backspace when current input is empty
      inputRefs.current[index - 1]?.focus();
      const newDigits = [...value];
      newDigits[index - 1] = "";
      onChange(newDigits);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;

    const newDigits = [...value];
    for (let i = 0; i < OTP_LENGTH && i < pasted.length; i++) {
      newDigits[i] = pasted[i]!;
    }
    onChange(newDigits);

    // Focus the next empty input or the last one
    const nextEmpty = newDigits.findIndex((d) => !d);
    const focusIndex = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
    inputRefs.current[focusIndex]?.focus();
  }

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={setRef(i)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          disabled={disabled}
          className={cn(
            "h-14 w-12 rounded-md border bg-background text-center text-2xl font-semibold transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-destructive focus:ring-destructive"
              : "border-input"
          )}
          aria-label={`หลักที่ ${i + 1}`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Countdown hook
// ---------------------------------------------------------------------------

function useCountdown(initialSeconds: number) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isActive || remaining <= 0) return;

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, remaining]);

  function restart() {
    setRemaining(initialSeconds);
    setIsActive(true);
  }

  return { remaining, isActive, restart };
}

// ---------------------------------------------------------------------------
// Step 1: Email
// ---------------------------------------------------------------------------

interface EmailStepProps {
  onSuccess: (email: string) => void;
}

function EmailStep({ onSuccess }: EmailStepProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: EmailFormValues) {
    setServerError(null);

    try {
      const result = await requestOtp({ email: data.email });
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      onSuccess(data.email.toLowerCase().trim());
    } catch {
      setServerError("เกิดข้อผิดพลาด กรุณาลองอีกครั้งภายหลัง");
    }
  }

  return (
    <>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">สร้างบัญชี</CardTitle>
        <CardDescription>กรอกอีเมลเพื่อเริ่มต้นการลงทะเบียน</CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          {serverError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {serverError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="register-email">อีเมล</Label>
            <Input
              id="register-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
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

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="text-primary-foreground" />
                กำลังส่งรหัส...
              </>
            ) : (
              "ส่งรหัสยืนยัน"
            )}
          </Button>
        </form>
      </CardContent>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 2: OTP
// ---------------------------------------------------------------------------

interface OtpStepProps {
  email: string;
  onSuccess: (sessionToken: string) => void;
  onBack: () => void;
}

function OtpStep({ email, onSuccess, onBack }: OtpStepProps) {
  const [digits, setDigits] = useState<string[]>(
    Array.from({ length: OTP_LENGTH }, () => "")
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const cooldownSeconds = Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000);
  const { remaining, isActive: isCooldownActive, restart } =
    useCountdown(cooldownSeconds);

  const handleDigitsChange = useCallback(
    async (newDigits: string[]) => {
      setDigits(newDigits);
      setServerError(null);

      // Auto-submit when all digits are filled
      const otp = newDigits.join("");
      if (otp.length === OTP_LENGTH && newDigits.every((d) => d !== "")) {
        setIsVerifying(true);
        try {
          const result = await verifyOtp({ email, otp });
          if (!result.success) {
            setServerError(result.error);
            // Clear digits on error for retry
            setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
          } else {
            onSuccess(result.data.sessionToken);
          }
        } catch {
          setServerError("เกิดข้อผิดพลาด กรุณาลองอีกครั้งภายหลัง");
        } finally {
          setIsVerifying(false);
        }
      }
    },
    [email, onSuccess]
  );

  async function handleResend() {
    setIsResending(true);
    setServerError(null);

    try {
      const result = await requestOtp({ email });
      if (!result.success) {
        setServerError(result.error);
      } else {
        restart();
        setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
      }
    } catch {
      setServerError("เกิดข้อผิดพลาด กรุณาลองอีกครั้งภายหลัง");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">ยืนยันอีเมล</CardTitle>
        <CardDescription className="leading-relaxed">
          เราส่งรหัส {OTP_LENGTH} หลักไปที่{" "}
          <span className="font-medium text-foreground">{email}</span>
          <button
            type="button"
            onClick={onBack}
            className="ml-1 text-primary underline-offset-4 hover:underline"
          >
            แก้ไข
          </button>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {serverError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {serverError}
          </div>
        )}

        <OtpInput
          value={digits}
          onChange={handleDigitsChange}
          disabled={isVerifying}
          error={!!serverError}
        />

        {isVerifying && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner size="sm" />
            กำลังตรวจสอบ...
          </div>
        )}

        <div className="flex flex-col items-center gap-2">
          {isCooldownActive ? (
            <p className="text-sm text-muted-foreground">
              ส่งรหัสใหม่ได้ใน {remaining} วินาที
            </p>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <Spinner size="sm" className="mr-1" />
                  กำลังส่ง...
                </>
              ) : (
                "ส่งรหัสอีกครั้ง"
              )}
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={onBack}
          className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          กลับไปแก้ไขอีเมล
        </button>
      </CardContent>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Complete Profile
// ---------------------------------------------------------------------------

interface CompleteStepProps {
  email: string;
  sessionToken: string;
}

function CompleteStep({ email, sessionToken }: CompleteStepProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CompleteFormValues>({
    resolver: zodResolver(completeSchema),
    defaultValues: { name: "", password: "", confirmPassword: "" },
  });

  const passwordValue = watch("password");
  const strength = getPasswordStrength(passwordValue);

  async function onSubmit(data: CompleteFormValues) {
    setServerError(null);

    try {
      const result = await completeRegistration({
        sessionToken,
        name: data.name,
        password: data.password,
      });

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setServerError("เกิดข้อผิดพลาด กรุณาลองอีกครั้งภายหลัง");
    }
  }

  return (
    <>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">กรอกข้อมูลบัญชี</CardTitle>
        <CardDescription>เกือบเสร็จแล้ว! กรอกข้อมูลเพื่อสร้างบัญชี</CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          {serverError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {serverError}
            </div>
          )}

          {/* Verified email badge */}
          <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2.5 text-sm">
            <CheckCircle2 className="size-4 shrink-0 text-green-600" />
            <span className="text-green-800">{email}</span>
            <span className="text-green-600">ยืนยันแล้ว</span>
          </div>

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
    </>
  );
}

// ---------------------------------------------------------------------------
// Main register form component
// ---------------------------------------------------------------------------

export function RegisterForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [sessionToken, setSessionToken] = useState("");

  return (
    <Card>
      {step === "email" && (
        <EmailStep
          onSuccess={(e) => {
            setEmail(e);
            setStep("otp");
          }}
        />
      )}

      {step === "otp" && (
        <OtpStep
          email={email}
          onSuccess={(token) => {
            setSessionToken(token);
            setStep("complete");
          }}
          onBack={() => setStep("email")}
        />
      )}

      {step === "complete" && (
        <CompleteStep email={email} sessionToken={sessionToken} />
      )}
    </Card>
  );
}

"use client";

import { useActionState } from "react";
import { submitContactForm } from "@/actions/contact.actions";
import type { ContactFormState } from "@/actions/contact.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ContactForm() {
  const [state, formAction, isPending] = useActionState<
    ContactFormState,
    FormData
  >(submitContactForm, null);

  // Show success message after submission
  if (state?.success) {
    return (
      <div className="rounded-lg border border-border bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-semibold text-foreground">
          ส่งข้อความเรียบร้อยแล้ว
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          ขอบคุณที่ติดต่อเรา เราจะตรวจสอบข้อความของคุณและติดต่อกลับภายใน 24
          ชั่วโมง
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Error banner */}
      {state?.success === false && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="contact-name">ชื่อ</Label>
        <Input
          id="contact-name"
          name="name"
          type="text"
          placeholder="ชื่อ-นามสกุลของคุณ"
          required
          disabled={isPending}
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="contact-email">อีเมล</Label>
        <Input
          id="contact-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          disabled={isPending}
        />
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="contact-subject">หัวข้อ</Label>
        <Input
          id="contact-subject"
          name="subject"
          type="text"
          placeholder="เรื่องที่ต้องการติดต่อ"
          required
          disabled={isPending}
        />
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label htmlFor="contact-message">ข้อความ</Label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          placeholder="กรุณาอธิบายรายละเอียด (อย่างน้อย 10 ตัวอักษร)..."
          required
          minLength={10}
          disabled={isPending}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "กำลังส่ง..." : "ส่งข้อความ"}
      </Button>
    </form>
  );
}

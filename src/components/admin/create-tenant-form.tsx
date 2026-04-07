"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Slug helpers
// ---------------------------------------------------------------------------

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Slug availability indicator
// ---------------------------------------------------------------------------

type SlugState = "idle" | "checking" | "available" | "taken" | "invalid";

function SlugIndicator({ state }: { state: SlugState }) {
  if (state === "idle") return null;

  if (state === "checking") {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        กำลังตรวจสอบ...
      </span>
    );
  }
  if (state === "available") {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Slug นี้ใช้งานได้
      </span>
    );
  }
  if (state === "taken") {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <XCircle className="h-3 w-3" />
        Slug นี้ถูกใช้งานแล้ว
      </span>
    );
  }
  if (state === "invalid") {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <XCircle className="h-3 w-3" />
        Slug ต้องมีอย่างน้อย 2 ตัวอักษร (a–z, 0–9, -)
      </span>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

interface FormState {
  name: string;
  slug: string;
  contactEmail: string;
  ownerEmail: string;
  ownerName: string;
  ownerRole: "OWNER" | "ADMIN";
}

export function CreateTenantForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [slugState, setSlugState] = React.useState<SlugState>("idle");
  const slugCheckTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether slug was manually edited to stop auto-generate from overwriting
  const slugManuallyEdited = React.useRef(false);

  const [form, setForm] = React.useState<FormState>({
    name: "",
    slug: "",
    contactEmail: "",
    ownerEmail: "",
    ownerName: "",
    ownerRole: "OWNER",
  });

  // Auto-generate slug from name unless user has manually edited it
  function handleNameChange(value: string) {
    setForm((prev) => {
      const next = { ...prev, name: value };
      if (!slugManuallyEdited.current) {
        next.slug = toSlug(value);
      }
      return next;
    });
    if (!slugManuallyEdited.current) {
      scheduleSlugCheck(toSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    slugManuallyEdited.current = true;
    const normalized = toSlug(value);
    setForm((prev) => ({ ...prev, slug: normalized }));
    scheduleSlugCheck(normalized);
  }

  // Debounced real-time uniqueness check via server action
  function scheduleSlugCheck(slug: string) {
    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    if (!slug || slug.length < 2) {
      setSlugState(slug.length === 0 ? "idle" : "invalid");
      return;
    }
    setSlugState("checking");
    slugCheckTimer.current = setTimeout(async () => {
      try {
        const { checkTenantSlugAvailable } = await import(
          "@/actions/tenant.actions"
        );
        const result = await checkTenantSlugAvailable(slug);
        setSlugState(result.available ? "available" : "taken");
      } catch {
        setSlugState("idle");
      }
    }, 500);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (slugState === "taken") {
      setFormError("กรุณาเปลี่ยน slug เนื่องจากถูกใช้งานแล้ว");
      return;
    }
    if (slugState === "invalid" || form.slug.length < 2) {
      setFormError("Slug ไม่ถูกต้อง");
      return;
    }

    startTransition(async () => {
      const { createTenant } = await import("@/actions/tenant.actions");
      const result = await createTenant({
        name: form.name,
        slug: form.slug,
        contactEmail: form.contactEmail || undefined,
        ownerEmail: form.ownerEmail || undefined,
      });

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      toast({
        title: "สร้าง Tenant แล้ว",
        description: `"${form.name}" ถูกเพิ่มเข้าระบบเรียบร้อยแล้ว`,
      });
      router.push(`/admin/tenants/${result.data.id}`);
    });
  }

  const canSubmit =
    form.name.trim().length >= 2 &&
    form.slug.length >= 2 &&
    slugState !== "taken" &&
    slugState !== "invalid" &&
    slugState !== "checking";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Basic info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ข้อมูลพื้นฐาน</CardTitle>
          <CardDescription>ชื่อและตัวระบุเฉพาะของ tenant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="tenant-name">
              ชื่อ Tenant <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tenant-name"
              placeholder="เช่น Acme Corporation"
              required
              minLength={2}
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="tenant-slug">
              Slug (URL identifier) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tenant-slug"
              placeholder="acme-corporation"
              required
              minLength={2}
              className={cn(
                "font-mono",
                slugState === "taken" && "border-destructive focus-visible:ring-destructive",
                slugState === "available" && "border-emerald-500 focus-visible:ring-emerald-500"
              )}
              value={form.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <SlugIndicator state={slugState} />
              {form.slug && (
                <span className="text-xs text-muted-foreground">
                  URL: <span className="font-mono">{form.slug}.example.com</span>
                </span>
              )}
            </div>
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              สร้างอัตโนมัติจากชื่อ แต่สามารถแก้ไขได้ ใช้ได้เฉพาะ a–z, 0–9 และ -
            </p>
          </div>

          {/* Contact email */}
          <div className="space-y-1.5">
            <Label htmlFor="contact-email">อีเมลติดต่อ (ไม่บังคับ)</Label>
            <Input
              id="contact-email"
              type="email"
              placeholder="contact@acme.com"
              value={form.contactEmail}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, contactEmail: e.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Owner assignment card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">กำหนด Owner (ไม่บังคับ)</CardTitle>
          <CardDescription>
            ระบุอีเมลของผู้ใช้ที่จะเป็น owner คนแรกของ tenant นี้
            หากไม่ระบุ สามารถเพิ่มภายหลังได้จากหน้ารายละเอียด
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="owner-email">อีเมลผู้ใช้</Label>
            <Input
              id="owner-email"
              type="email"
              placeholder="owner@acme.com"
              value={form.ownerEmail}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, ownerEmail: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              หากผู้ใช้ยังไม่มีบัญชี ระบุชื่อด้านล่างเพื่อสร้างบัญชีใหม่
            </p>
          </div>

          {form.ownerEmail && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="owner-name">ชื่อ (ถ้าต้องการสร้างบัญชีใหม่)</Label>
                <Input
                  id="owner-name"
                  placeholder="ชื่อ-นามสกุล"
                  value={form.ownerName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, ownerName: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="owner-role">บทบาทใน Tenant</Label>
                <Select
                  value={form.ownerRole}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      ownerRole: v as "OWNER" | "ADMIN",
                    }))
                  }
                >
                  <SelectTrigger id="owner-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OWNER">OWNER — จัดการ tenant ทั้งหมด</SelectItem>
                    <SelectItem value="ADMIN">ADMIN — จัดการเนื้อหาและสมาชิก</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Form error */}
      {formError && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {formError}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || !canSubmit}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          สร้าง Tenant
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/tenants")}
          disabled={isPending}
        >
          ยกเลิก
        </Button>
      </div>
    </form>
  );
}

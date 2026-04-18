"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { PermissionTypeSelector } from "./permission-type-selector";
import { DurationPicker } from "./duration-picker";
import { DateRangePicker } from "./date-range-picker";

import { updatePermissionExpiry } from "@/actions/permission.actions";
import type { SafePermissionRow } from "@/types";
import type { PermissionTimeConfig } from "@/lib/permission-utils";

interface PermissionEditSheetProps {
  permission: SafePermissionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PermissionEditSheet({
  permission,
  open,
  onOpenChange,
}: PermissionEditSheetProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Derive initial mode from the permission data
  const initialMode = permission
    ? (permission.durationDays || permission.durationHours)
      ? "relative"
      : permission.validFrom || permission.validUntil
        ? "absolute"
        : "permanent"
    : "permanent";

  const [mode, setMode] = useState<"permanent" | "relative" | "absolute">(initialMode);
  const [durationDays, setDurationDays] = useState(permission?.durationDays ?? 30);
  const [durationHours, setDurationHours] = useState(permission?.durationHours ?? 0);
  const [startDate, setStartDate] = useState<Date | undefined>(
    permission?.validFrom ?? undefined,
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    permission?.validUntil ?? undefined,
  );

  // Reset state when permission changes
  const [lastPermId, setLastPermId] = useState<string | null>(null);
  if (permission && permission.id !== lastPermId) {
    setLastPermId(permission.id);
    const m = (permission.durationDays || permission.durationHours)
      ? "relative"
      : permission.validFrom || permission.validUntil
        ? "absolute"
        : "permanent";
    setMode(m as typeof mode);
    setDurationDays(permission.durationDays ?? 30);
    setDurationHours(permission.durationHours ?? 0);
    setStartDate(permission.validFrom ?? undefined);
    setEndDate(permission.validUntil ?? undefined);
  }

  const handleSave = () => {
    if (!permission) return;

    let timeConfig: PermissionTimeConfig;
    if (mode === "permanent") {
      timeConfig = { mode: "permanent" };
    } else if (mode === "relative") {
      timeConfig = { mode: "relative", durationDays, durationHours };
    } else {
      if (!startDate || !endDate || endDate <= startDate) {
        toast({ variant: "destructive", title: "ช่วงวันที่ไม่ถูกต้อง" });
        return;
      }
      timeConfig = { mode: "absolute", validFrom: startDate, validUntil: endDate };
    }

    startTransition(async () => {
      const result = await updatePermissionExpiry(permission.id, timeConfig);
      if (!result.success) {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
      } else {
        toast({ title: "อัปเดตสิทธิ์แล้ว" });
        onOpenChange(false);
        router.refresh();
      }
    });
  };

  if (!permission) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>แก้ไขสิทธิ์</SheetTitle>
          <SheetDescription>
            {permission.user.name ?? permission.user.email} &mdash; {permission.video.title}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Current status */}
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">สถานะปัจจุบัน</p>
            <Badge variant={permission.status === "expired" ? "destructive" : "outline"}>
              {permission.status}
            </Badge>
            <p className="text-sm text-muted-foreground">
              ให้สิทธิ์เมื่อ {new Date(permission.grantedAt).toLocaleDateString("th-TH")}
            </p>
          </div>

          {/* Permission type selector */}
          <PermissionTypeSelector value={mode} onChange={setMode} />

          {/* Conditional pickers */}
          {mode === "relative" && (
            <DurationPicker
              days={durationDays}
              hours={durationHours}
              onDaysChange={setDurationDays}
              onHoursChange={setDurationHours}
            />
          )}
          {mode === "absolute" && (
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartChange={setStartDate}
              onEndChange={setEndDate}
            />
          )}
          {mode === "permanent" && (
            <p className="text-sm text-muted-foreground">
              ไม่มีวันหมดอายุ &mdash; เข้าถึงได้จนกว่าจะเพิกถอน
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              บันทึกการเปลี่ยนแปลง
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

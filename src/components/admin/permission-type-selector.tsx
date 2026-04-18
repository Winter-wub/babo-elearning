"use client";

import { Infinity, Clock, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

type PermissionMode = "permanent" | "relative" | "absolute";

interface PermissionTypeSelectorProps {
  value: PermissionMode;
  onChange: (value: PermissionMode) => void;
}

const options: { mode: PermissionMode; label: string; icon: typeof Infinity; desc: string }[] = [
  { mode: "permanent", label: "ถาวร", icon: Infinity, desc: "ไม่มีวันหมดอายุ" },
  { mode: "relative", label: "ระยะเวลา", icon: Clock, desc: "หมดอายุหลังจากระยะเวลาที่กำหนด" },
  { mode: "absolute", label: "ช่วงวันที่", icon: CalendarRange, desc: "กำหนดช่วงเวลา" },
];

export function PermissionTypeSelector({ value, onChange }: PermissionTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {options.map(({ mode, label, icon: Icon, desc }) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
            value === mode
              ? "border-primary bg-primary/5 ring-2 ring-primary"
              : "border-border hover:bg-muted/50",
          )}
        >
          <Icon className="h-5 w-5" />
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">{desc}</span>
        </button>
      ))}
    </div>
  );
}

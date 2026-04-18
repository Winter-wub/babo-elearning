"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DurationUnit = "days" | "hours";

const DAY_PRESETS = [
  { value: "7", label: "7 วัน" },
  { value: "14", label: "14 วัน" },
  { value: "30", label: "30 วัน" },
  { value: "60", label: "60 วัน" },
  { value: "90", label: "90 วัน" },
  { value: "180", label: "180 วัน" },
  { value: "365", label: "1 ปี" },
  { value: "custom", label: "กำหนดเอง..." },
];

const HOUR_PRESETS = [
  { value: "1", label: "1 ชั่วโมง" },
  { value: "2", label: "2 ชั่วโมง" },
  { value: "3", label: "3 ชั่วโมง" },
  { value: "6", label: "6 ชั่วโมง" },
  { value: "12", label: "12 ชั่วโมง" },
  { value: "24", label: "24 ชั่วโมง" },
  { value: "48", label: "48 ชั่วโมง" },
  { value: "custom", label: "กำหนดเอง..." },
];

interface DurationPickerProps {
  days: number;
  hours: number;
  onDaysChange: (days: number) => void;
  onHoursChange: (hours: number) => void;
}

export function DurationPicker({ days, hours, onDaysChange, onHoursChange }: DurationPickerProps) {
  const [unit, setUnit] = useState<DurationUnit>(days > 0 || hours === 0 ? "days" : "hours");
  const presets = unit === "days" ? DAY_PRESETS : HOUR_PRESETS;
  const currentValue = unit === "days" ? days : hours;

  const isPreset = presets.some((p) => p.value === String(currentValue));
  const [isCustom, setIsCustom] = useState(!isPreset);

  const handleUnitChange = (newUnit: string) => {
    if (!newUnit) return;
    const u = newUnit as DurationUnit;
    setUnit(u);
    setIsCustom(false);
    if (u === "days") {
      onHoursChange(0);
      if (days === 0) onDaysChange(30);
    } else {
      onDaysChange(0);
      if (hours === 0) onHoursChange(24);
    }
  };

  const handleSelect = (v: string) => {
    if (v === "custom") {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      const num = Number(v);
      if (unit === "days") {
        onDaysChange(num);
        onHoursChange(0);
      } else {
        onHoursChange(num);
        onDaysChange(0);
      }
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = Number(e.target.value) || 0;
    if (unit === "days") {
      onDaysChange(Math.max(1, Math.min(3650, num)));
    } else {
      onHoursChange(Math.max(1, Math.min(8760, num)));
    }
  };

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  expiryDate.setHours(expiryDate.getHours() + hours);

  const unitLabel = unit === "days" ? "วัน" : "ชั่วโมง";
  const maxVal = unit === "days" ? 3650 : 8760;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Label className="shrink-0">หน่วย</Label>
        <div className="inline-flex rounded-md border">
          {(["days", "hours"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => handleUnitChange(u)}
              className={cn(
                "px-3 py-1.5 text-sm transition-colors first:rounded-l-md last:rounded-r-md",
                unit === u
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {u === "days" ? "วัน" : "ชั่วโมง"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Label className="shrink-0">เข้าถึงได้</Label>
        <Select
          value={isCustom ? "custom" : String(currentValue)}
          onValueChange={handleSelect}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {presets.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isCustom && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={maxVal}
              className="w-20"
              value={currentValue}
              onChange={handleCustomChange}
            />
            <span className="text-sm text-muted-foreground">{unitLabel}</span>
          </div>
        )}
        <span className="text-sm text-muted-foreground">จากเวลาที่ให้สิทธิ์</span>
      </div>
      <p className="text-xs text-muted-foreground">
        หมดอายุ: ~{expiryDate.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
        {hours > 0 && ` ${expiryDate.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`}
      </p>
    </div>
  );
}

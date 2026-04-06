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

const PRESETS = [
  { value: "7", label: "7 วัน" },
  { value: "14", label: "14 วัน" },
  { value: "30", label: "30 วัน" },
  { value: "60", label: "60 วัน" },
  { value: "90", label: "90 วัน" },
  { value: "180", label: "180 วัน" },
  { value: "365", label: "1 ปี" },
  { value: "custom", label: "กำหนดเอง..." },
];

interface DurationPickerProps {
  value: number;
  onChange: (days: number) => void;
}

export function DurationPicker({ value, onChange }: DurationPickerProps) {
  const isPreset = PRESETS.some((p) => p.value === String(value));
  const [isCustom, setIsCustom] = useState(!isPreset);

  const handleSelect = (v: string) => {
    if (v === "custom") {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      onChange(Number(v));
    }
  };

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + value);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Label className="shrink-0">เข้าถึงได้</Label>
        <Select
          value={isCustom ? "custom" : String(value)}
          onValueChange={handleSelect}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
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
              max={3650}
              className="w-20"
              value={value}
              onChange={(e) => onChange(Math.max(1, Math.min(3650, Number(e.target.value) || 1)))}
            />
            <span className="text-sm text-muted-foreground">วัน</span>
          </div>
        )}
        <span className="text-sm text-muted-foreground">จากเวลาที่ให้สิทธิ์</span>
      </div>
      <p className="text-xs text-muted-foreground">
        หมดอายุ: ~{expiryDate.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
      </p>
    </div>
  );
}

"use client";

import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartChange: (date: Date | undefined) => void;
  onEndChange: (date: Date | undefined) => void;
}

function DateTimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
}) {
  const dateOnly = value
    ? new Date(value.getFullYear(), value.getMonth(), value.getDate())
    : undefined;

  const timeStr = value
    ? `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`
    : "00:00";

  const handleDateSelect = (day: Date | undefined) => {
    if (!day) {
      onChange(undefined);
      return;
    }
    const merged = new Date(day);
    if (value) {
      merged.setHours(value.getHours(), value.getMinutes(), 0, 0);
    }
    onChange(merged);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h, m] = e.target.value.split(":").map(Number);
    const base = value ? new Date(value) : new Date();
    base.setHours(h ?? 0, m ?? 0, 0, 0);
    onChange(base);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[160px] justify-start text-left font-normal",
                !value && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateOnly
                ? dateOnly.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "เลือกวันที่"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateOnly}
              onSelect={handleDateSelect}
            />
          </PopoverContent>
        </Popover>
        <Input
          type="time"
          className="w-[110px]"
          value={timeStr}
          onChange={handleTimeChange}
        />
      </div>
    </div>
  );
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: DateRangePickerProps) {
  const isInvalid = startDate && endDate && endDate <= startDate;

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <DateTimePicker label="วันที่และเวลาเริ่มต้น" value={startDate} onChange={onStartChange} />
        <DateTimePicker label="วันที่และเวลาสิ้นสุด" value={endDate} onChange={onEndChange} />
      </div>
      {isInvalid && (
        <p className="text-xs text-destructive">วันที่สิ้นสุดต้องหลังจากวันที่เริ่มต้น</p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { createInviteLink } from "@/actions/invite.actions";
import { PermissionTypeSelector } from "./permission-type-selector";
import { DurationPicker } from "./duration-picker";
import { DateRangePicker } from "./date-range-picker";
import { CheckCircle2, Copy, Check, Search } from "lucide-react";

interface CreateInviteLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videos: { id: string; title: string }[];
}

export function CreateInviteLinkDialog({
  open,
  onOpenChange,
  videos,
}: CreateInviteLinkDialogProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [label, setLabel] = useState("");
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [videoSearch, setVideoSearch] = useState("");
  const [timeMode, setTimeMode] = useState<"permanent" | "relative" | "absolute">("permanent");
  const [durationDays, setDurationDays] = useState(30);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [hasMaxRedemptions, setHasMaxRedemptions] = useState(false);
  const [maxRedemptions, setMaxRedemptions] = useState(50);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

  // Result state
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredVideos = videos.filter((v) =>
    v.title.toLowerCase().includes(videoSearch.toLowerCase()),
  );

  const toggleVideo = (videoId: string) => {
    setSelectedVideoIds((prev) =>
      prev.includes(videoId)
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId],
    );
  };

  const toggleAll = () => {
    if (selectedVideoIds.length === filteredVideos.length) {
      setSelectedVideoIds([]);
    } else {
      setSelectedVideoIds(filteredVideos.map((v) => v.id));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const result = await createInviteLink({
      label,
      videoIds: selectedVideoIds,
      timeMode,
      durationDays: timeMode === "relative" ? durationDays : null,
      validFrom: timeMode === "absolute" ? startDate ?? null : null,
      validUntil: timeMode === "absolute" ? endDate ?? null : null,
      maxRedemptions: hasMaxRedemptions ? maxRedemptions : null,
      expiresAt: hasExpiry && expiresAt ? new Date(expiresAt) : null,
    });
    setIsSubmitting(false);

    if (result.success) {
      setResultUrl(result.data.inviteUrl);
      router.refresh();
    } else {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleCopy = async () => {
    if (!resultUrl) return;
    await navigator.clipboard.writeText(resultUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after close animation
    setTimeout(() => {
      setLabel("");
      setSelectedVideoIds([]);
      setVideoSearch("");
      setTimeMode("permanent");
      setDurationDays(30);
      setStartDate(undefined);
      setEndDate(undefined);
      setHasMaxRedemptions(false);
      setMaxRedemptions(50);
      setHasExpiry(false);
      setExpiresAt("");
      setResultUrl(null);
      setCopied(false);
    }, 300);
  };

  // Summary text
  const summaryParts: string[] = [];
  summaryParts.push(`${selectedVideoIds.length} วิดีโอ`);
  if (timeMode === "permanent") summaryParts.push("เข้าถึงถาวร");
  else if (timeMode === "relative") summaryParts.push(`เข้าถึง ${durationDays} วัน`);
  else summaryParts.push("ช่วงวันที่กำหนด");
  if (hasMaxRedemptions) summaryParts.push(`ใช้ได้ ${maxRedemptions} ครั้ง`);
  if (hasExpiry && expiresAt)
    summaryParts.push(
      `หมดอายุ ${new Date(expiresAt).toLocaleDateString("th-TH", { month: "short", day: "numeric", year: "numeric" })}`,
    );

  // --- Success state ---
  if (resultUrl) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">สร้างลิงก์เรียบร้อยแล้ว</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                แชร์ลิงก์นี้ให้นักเรียนเพื่อลงทะเบียน
              </p>
            </div>
            <div className="flex w-full items-center gap-2">
              <Input
                readOnly
                value={resultUrl}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // --- Form state ---
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>สร้างลิงก์เชิญ</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section 1: Link Info */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">ชื่อลิงก์ (ใช้สำหรับระบุภายใน)</Label>
            <Input
              placeholder="เช่น คอร์สภาษาอังกฤษ มีนาคม 2569"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          {/* Section 2: Video Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">วิดีโอที่ได้รับสิทธิ์</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหาวิดีโอ..."
                className="pl-9"
                value={videoSearch}
                onChange={(e) => setVideoSearch(e.target.value)}
              />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md border p-2">
              {filteredVideos.length > 0 && (
                <div className="mb-2 flex items-center gap-2 border-b pb-2">
                  <Checkbox
                    checked={
                      filteredVideos.length > 0 &&
                      filteredVideos.every((v) =>
                        selectedVideoIds.includes(v.id),
                      )
                    }
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    เลือกทั้งหมด ({filteredVideos.length})
                  </span>
                </div>
              )}
              {filteredVideos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center gap-2 rounded px-1 py-1.5 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedVideoIds.includes(video.id)}
                    onCheckedChange={() => toggleVideo(video.id)}
                  />
                  <span className="text-sm">{video.title}</span>
                </div>
              ))}
              {filteredVideos.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  ไม่พบวิดีโอ
                </p>
              )}
            </div>
            {selectedVideoIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                เลือกแล้ว {selectedVideoIds.length} รายการ
              </p>
            )}
          </div>

          {/* Section 3: Permission Time Config */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">ระยะเวลาการเข้าถึงวิดีโอ</Label>
            <PermissionTypeSelector value={timeMode} onChange={setTimeMode} />
            {timeMode === "relative" && (
              <DurationPicker value={durationDays} onChange={setDurationDays} />
            )}
            {timeMode === "absolute" && (
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartChange={setStartDate}
                onEndChange={setEndDate}
              />
            )}
          </div>

          {/* Section 4: Link Settings */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">การตั้งค่าลิงก์</Label>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">จำกัดจำนวนการใช้งาน</p>
                <p className="text-xs text-muted-foreground">
                  จำกัดจำนวนนักเรียนที่สามารถสมัครผ่านลิงก์นี้
                </p>
              </div>
              <Switch
                checked={hasMaxRedemptions}
                onCheckedChange={setHasMaxRedemptions}
              />
            </div>
            {hasMaxRedemptions && (
              <Input
                type="number"
                min={1}
                value={maxRedemptions}
                onChange={(e) =>
                  setMaxRedemptions(Math.max(1, Number(e.target.value) || 1))
                }
                className="w-32"
                placeholder="50"
              />
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">กำหนดวันหมดอายุ</p>
                <p className="text-xs text-muted-foreground">
                  ลิงก์จะหมดอายุและไม่สามารถใช้สมัครได้
                </p>
              </div>
              <Switch checked={hasExpiry} onCheckedChange={setHasExpiry} />
            </div>
            {hasExpiry && (
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-48"
              />
            )}
          </div>

          {/* Summary */}
          {selectedVideoIds.length > 0 && (
            <div className="rounded-md bg-muted/50 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {summaryParts.join(" · ")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !label.trim() ||
              selectedVideoIds.length === 0 ||
              (timeMode === "absolute" && (!startDate || !endDate || endDate <= startDate))
            }
          >
            {isSubmitting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                กำลังสร้าง...
              </>
            ) : (
              "สร้างลิงก์"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

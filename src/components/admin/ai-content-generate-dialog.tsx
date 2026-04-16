"use client";

import * as React from "react";
import {
  Sparkles,
  Loader2,
  Check,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Tone, Language, FieldType } from "@/lib/ai/content-prompt-builder";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface AiContentGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "section" | "field";
  prefix: string;
  sectionLabel: string;
  fields: { key: string; currentValue: string; fieldType: FieldType }[];
  targetFieldKey?: string;
  onApply: (generated: Record<string, string>) => void;
}

// -----------------------------------------------------------------------
// Tone / Language options
// -----------------------------------------------------------------------

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "professional", label: "มืออาชีพ (Professional)" },
  { value: "formal", label: "เป็นทางการ (Formal)" },
  { value: "friendly", label: "เป็นมิตร (Friendly)" },
  { value: "casual", label: "เป็นกันเอง (Casual)" },
  { value: "energetic", label: "กระตือรือร้น (Energetic)" },
  { value: "minimal", label: "กระชับ (Minimal)" },
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "th", label: "ไทย" },
  { value: "en", label: "English" },
];

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function AiContentGenerateDialog({
  open,
  onOpenChange,
  mode,
  prefix,
  sectionLabel,
  fields,
  targetFieldKey,
  onApply,
}: AiContentGenerateDialogProps) {
  const { toast } = useToast();
  const abortRef = React.useRef<AbortController | null>(null);

  // Config state
  const [tone, setTone] = React.useState<Tone>("professional");
  const [language, setLanguage] = React.useState<Language>("th");
  const [instructions, setInstructions] = React.useState("");

  // Generation state
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [preview, setPreview] = React.useState<Record<string, string> | null>(
    null
  );
  const [error, setError] = React.useState<string | null>(null);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      setPreview(null);
      setError(null);
      setIsGenerating(false);
      setInstructions("");
    }
  }, [open]);

  // -------------------------------------------------------------------
  // Generate handler
  // -------------------------------------------------------------------

  async function handleGenerate() {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsGenerating(true);
    setError(null);
    setPreview(null);

    try {
      const response = await fetch("/api/admin/content/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          prefix,
          sectionLabel,
          fields:
            mode === "field" && targetFieldKey
              ? fields
                  .filter((f) => f.key === targetFieldKey)
                  .map((f) => ({
                    key: f.key,
                    currentValue: f.currentValue,
                    fieldType: f.fieldType,
                  }))
              : fields.map((f) => ({
                  key: f.key,
                  currentValue: f.currentValue,
                  fieldType: f.fieldType,
                })),
          targetFieldKey,
          tone,
          language,
          additionalInstructions: instructions,
        }),
        signal: abortRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? `Error ${response.status}`);
      }

      setPreview(data.generated);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message =
        err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่";
      setError(message);
      toast({ variant: "destructive", title: "ข้อผิดพลาด", description: message });
    } finally {
      setIsGenerating(false);
    }
  }

  // -------------------------------------------------------------------
  // Apply handler
  // -------------------------------------------------------------------

  function handleApply() {
    if (!preview) return;
    onApply(preview);
    onOpenChange(false);
  }

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  const targetFields =
    mode === "field" && targetFieldKey
      ? fields.filter((f) => f.key === targetFieldKey)
      : fields;

  const dialogTitle =
    mode === "field"
      ? `AI สร้างเนื้อหา — ${targetFieldKey}`
      : `AI สร้างเนื้อหา — ${sectionLabel}`;

  const dialogDescription =
    mode === "field"
      ? "สร้างเนื้อหาใหม่สำหรับฟิลด์นี้ด้วย AI"
      : `สร้างเนื้อหาใหม่สำหรับทุกฟิลด์ในส่วน "${sectionLabel}" ด้วย AI`;

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" aria-hidden="true" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
          {/* ── Configuration ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            {/* Tone */}
            <div className="space-y-1.5">
              <Label htmlFor="ai-tone">โทนเสียง</Label>
              <Select
                value={tone}
                onValueChange={(v) => setTone(v as Tone)}
              >
                <SelectTrigger id="ai-tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Language */}
            <div className="space-y-1.5">
              <Label htmlFor="ai-language">ภาษา</Label>
              <Select
                value={language}
                onValueChange={(v) => setLanguage(v as Language)}
              >
                <SelectTrigger id="ai-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional instructions */}
          <div className="space-y-1.5">
            <Label htmlFor="ai-instructions">
              คำแนะนำเพิ่มเติม{" "}
              <span className="text-muted-foreground font-normal">
                (ไม่บังคับ)
              </span>
            </Label>
            <textarea
              id="ai-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="เช่น เน้นกลุ่มเป้าหมายนักเรียน IELTS อายุ 20-30 ปี..."
              rows={2}
              maxLength={500}
              className={cn(
                "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                "ring-offset-background placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "resize-none"
              )}
            />
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {isGenerating
              ? "กำลังสร้างเนื้อหา..."
              : preview
                ? "สร้างใหม่"
                : "สร้างเนื้อหา"}
          </Button>

          {/* Error */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* ── Preview ───────────────────────────────────────────── */}
          {preview && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                ตัวอย่างเนื้อหาที่สร้าง
              </h3>
              <div className="space-y-3">
                {targetFields.map((field) => {
                  const newValue = preview[field.key];
                  if (newValue === undefined) return null;
                  const changed = newValue !== field.currentValue;

                  return (
                    <div
                      key={field.key}
                      className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <code className="text-xs font-mono text-muted-foreground">
                          {field.key}
                        </code>
                        {changed && (
                          <span className="text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                            เปลี่ยนแปลง
                          </span>
                        )}
                      </div>

                      {/* Current value */}
                      {field.currentValue && changed && (
                        <div className="text-xs text-muted-foreground line-through">
                          {field.currentValue.length > 120
                            ? field.currentValue.slice(0, 120) + "..."
                            : field.currentValue}
                        </div>
                      )}

                      {/* New value */}
                      <div
                        className={cn(
                          "text-sm",
                          changed
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {field.fieldType === "color" ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-6 w-6 rounded border border-input"
                              style={{ backgroundColor: newValue }}
                              aria-hidden="true"
                            />
                            <span className="font-mono">{newValue}</span>
                          </div>
                        ) : (
                          <span>
                            {newValue.length > 200
                              ? newValue.slice(0, 200) + "..."
                              : newValue}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        {preview && (
          <DialogFooter className="px-6 py-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              <RefreshCw
                className={cn(
                  "mr-2 h-4 w-4",
                  isGenerating && "animate-spin"
                )}
                aria-hidden="true"
              />
              สร้างใหม่
            </Button>
            <Button onClick={handleApply}>
              <Check className="mr-2 h-4 w-4" aria-hidden="true" />
              ใช้เนื้อหาที่สร้าง
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

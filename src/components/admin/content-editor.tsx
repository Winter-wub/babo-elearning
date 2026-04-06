"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  FileText,
  Search,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { bulkUpdateSiteContent } from "@/actions/content.actions";
import { cn } from "@/lib/utils";
import type { SiteContent } from "@prisma/client";
import { ContentPreview, type PreviewContext } from "./content-preview";
import { RichTextEditor } from "./rich-text-editor";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface ContentEditorProps {
  entries: SiteContent[];
}

interface ContentGroup {
  prefix: string;
  label: string;
  thaiLabel: string;
  entries: { key: string; value: string }[];
}

// -----------------------------------------------------------------------
// Constants — human-readable Thai labels per prefix
// -----------------------------------------------------------------------

const PREFIX_LABELS: Record<string, string> = {
  hero: "หน้าแรก — Hero",
  about: "เกี่ยวกับเรา — About",
  footer: "ส่วนท้าย — Footer",
  contact: "ติดต่อเรา — Contact",
  faq: "คำถามที่พบบ่อย — FAQ",
  privacy: "นโยบายความเป็นส่วนตัว",
  terms: "ข้อกำหนดการใช้งาน",
  site: "ข้อมูลทั่วไป — Site",
  app: "แอปพลิเคชัน — App",
};

/** Explicit display order for content sections */
const PREFIX_ORDER: string[] = [
  "hero",
  "site",
  "app",
  "about",
  "footer",
  "faq",
  "contact",
  "privacy",
  "terms",
];

/** Map prefix → default preview context */
const PREFIX_TO_CONTEXT: Record<string, PreviewContext> = {
  hero: "home",
  footer: "footer",
  site: "home",
  app: "home",
  about: "content",
  privacy: "content",
  terms: "content",
  contact: "content",
  faq: "content",
};

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function prefixToLabel(prefix: string): string {
  return (
    PREFIX_LABELS[prefix] ??
    prefix
      .split(".")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" > ")
  );
}

function keyToDisplayLabel(key: string, prefix: string): string {
  const suffix = key.startsWith(prefix + ".") ? key.slice(prefix.length + 1) : key;
  return suffix
    .split(".")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" › ")
    .replace(/[_-]/g, " ");
}

function groupEntries(entries: { key: string; value: string }[]): ContentGroup[] {
  const map = new Map<string, { key: string; value: string }[]>();

  for (const entry of entries) {
    const dotIndex = entry.key.indexOf(".");
    const prefix = dotIndex > -1 ? entry.key.slice(0, dotIndex) : entry.key;
    if (!map.has(prefix)) map.set(prefix, []);
    map.get(prefix)!.push(entry);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => {
      const ai = PREFIX_ORDER.indexOf(a);
      const bi = PREFIX_ORDER.indexOf(b);
      // Known prefixes sort by explicit order; unknown go to the end alphabetically
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    })
    .map(([prefix, entries]) => ({
      prefix,
      label: prefixToLabel(prefix),
      thaiLabel: PREFIX_LABELS[prefix] ?? prefix,
      entries: entries.sort((a, b) => a.key.localeCompare(b.key)),
    }));
}

/** Key suffixes (last segment) that should use the rich text editor */
const RICH_TEXT_SUFFIXES = new Set(["description", "content", "body", "text", "detail"]);

/** Decide whether a content field should use the rich text editor */
function isRichTextField(key: string): boolean {
  const suffix = key.split(".").pop() ?? "";
  return RICH_TEXT_SUFFIXES.has(suffix);
}

/** Decide whether a content value should use a Textarea (long) or Input (short) */
function isLongValue(key: string, value: string): boolean {
  const suffix = key.split(".").pop() ?? "";
  return (
    value.length > 80 ||
    suffix === "description" ||
    suffix === "address" ||
    isRichTextField(key)
  );
}

// -----------------------------------------------------------------------
// Section component
// -----------------------------------------------------------------------

interface ContentSectionProps {
  group: ContentGroup;
  values: Record<string, string>;
  dirty: Set<string>;
  savedValues: Record<string, string>;
  onValueChange: (key: string, value: string) => void;
  onResetField: (key: string) => void;
  onSaveSection: (prefix: string) => void;
  isSaving: boolean;
  resetKeys: Record<string, number>;
}

const ContentSection = React.memo(function ContentSection({
  group,
  values,
  dirty,
  savedValues,
  onValueChange,
  onResetField,
  onSaveSection,
  isSaving,
  resetKeys,
}: ContentSectionProps) {
  const [isOpen, setIsOpen] = React.useState(true);
  const dirtyCount = group.entries.filter((e) => dirty.has(e.key)).length;

  return (
    <Card
      id={`section-${group.prefix}`}
      className="overflow-hidden transition-shadow duration-200 hover:shadow-sm"
    >
      {/* Collapsible header — uses a div with role=button for the toggle area,
           keeping the save Button outside so we don't nest <button> in <button>. */}
      <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsOpen((v) => !v);
            }
          }}
          className="flex items-center gap-2 min-w-0 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          aria-expanded={isOpen}
          aria-controls={`section-body-${group.prefix}`}
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <CardTitle className="text-base leading-tight">{group.label}</CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              {group.entries.length} รายการ (คีย์นำหน้า:{" "}
              <code className="font-mono">{group.prefix}.*</code>)
            </CardDescription>
          </div>
        </div>
        {/* Dirty badge + section save button */}
        <div className="flex shrink-0 items-center gap-2">
          {dirtyCount > 0 && (
            <Badge
              variant="outline"
              className="border-amber-400 text-amber-600 dark:border-amber-500 dark:text-amber-400 text-[11px] shrink-0"
            >
              {dirtyCount} แก้ไขแล้ว
            </Badge>
          )}
          {dirtyCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSaveSection(group.prefix)}
              disabled={isSaving}
              className="h-7 text-xs"
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-3 w-3" aria-hidden="true" />
              )}
              <span className="ml-1">บันทึกส่วนนี้</span>
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Collapsible body */}
      {isOpen && (
        <CardContent id={`section-body-${group.prefix}`} className="space-y-5 pt-0">
          {group.entries.map((entry) => {
            const isDirty = dirty.has(entry.key);
            const usesTextarea = isLongValue(entry.key, values[entry.key] ?? "");

            return (
              <div key={entry.key} className="space-y-1.5">
                {/* Label row */}
                <div className="flex items-center justify-between gap-2">
                  <Label
                    htmlFor={`content-${entry.key}`}
                    className="flex flex-wrap items-center gap-1.5"
                  >
                    <span className="font-medium text-sm">
                      {keyToDisplayLabel(entry.key, group.prefix)}
                    </span>
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {entry.key}
                    </code>
                    {isDirty && (
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500"
                        aria-label="มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก"
                      />
                    )}
                  </Label>
                  {isDirty && (
                    <button
                      type="button"
                      onClick={() => onResetField(entry.key)}
                      className={cn(
                        "flex items-center gap-1 text-[11px] text-muted-foreground",
                        "rounded px-1.5 py-0.5 transition-colors",
                        "hover:bg-muted hover:text-foreground",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      )}
                      aria-label={`รีเซ็ต ${entry.key} เป็นค่าที่บันทึกไว้`}
                    >
                      <RotateCcw className="h-3 w-3" aria-hidden="true" />
                      รีเซ็ต
                    </button>
                  )}
                </div>

                {/* Input / RichText / Textarea — uncontrolled for performance */}
                {isRichTextField(entry.key) ? (
                  <RichTextEditor
                    key={`${entry.key}-${resetKeys[entry.key] ?? 0}`}
                    value={values[entry.key] ?? ""}
                    onChange={(html) => onValueChange(entry.key, html)}
                    isDirty={isDirty}
                    placeholder={`เนื้อหาสำหรับ ${keyToDisplayLabel(entry.key, group.prefix)}...`}
                  />
                ) : usesTextarea ? (
                  <textarea
                    key={`${entry.key}-${resetKeys[entry.key] ?? 0}`}
                    id={`content-${entry.key}`}
                    defaultValue={values[entry.key] ?? ""}
                    onChange={(e) => onValueChange(entry.key, e.target.value)}
                    rows={3}
                    className={cn(
                      "flex w-full rounded-md border bg-background px-3 py-2 text-sm",
                      "ring-offset-background placeholder:text-muted-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      "disabled:cursor-not-allowed disabled:opacity-50 transition-colors resize-y",
                      isDirty
                        ? "border-amber-400/60 dark:border-amber-500/40"
                        : "border-input"
                    )}
                  />
                ) : (
                  <Input
                    key={`${entry.key}-${resetKeys[entry.key] ?? 0}`}
                    id={`content-${entry.key}`}
                    defaultValue={values[entry.key] ?? ""}
                    onChange={(e) => onValueChange(entry.key, e.target.value)}
                    className={cn(
                      "transition-colors",
                      isDirty && "border-amber-400/60 dark:border-amber-500/40"
                    )}
                  />
                )}

                {/* Show original saved value if dirty */}
                {isDirty && savedValues[entry.key] !== undefined && (
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium">ค่าเดิม:</span>{" "}
                    <span className="italic">
                      {savedValues[entry.key] === ""
                        ? "(ว่างเปล่า)"
                        : savedValues[entry.key].length > 80
                          ? savedValues[entry.key].slice(0, 80) + "…"
                          : savedValues[entry.key]}
                    </span>
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
});

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------

export function ContentEditor({ entries }: ContentEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  // Canonical saved values — ref because we mutate in-place after saves
  const savedValuesRef = React.useRef<Record<string, string> | null>(null);
  if (savedValuesRef.current === null) {
    const map: Record<string, string> = {};
    for (const e of entries) map[e.key] = e.value;
    savedValuesRef.current = map;
  }
  const savedValues = savedValuesRef.current;

  // ---- Refs: updated instantly on every keystroke, zero re-renders ----
  const valuesRef = React.useRef<Record<string, string>>({ ...savedValues });
  const dirtyRef = React.useRef<Set<string>>(new Set());
  const flushTimerRef = React.useRef<ReturnType<typeof setTimeout>>();

  // ---- State: only updated via debounced flush (300ms after last keystroke) ----
  const [displayState, setDisplayState] = React.useState(() => ({
    values: { ...savedValues } as Record<string, string>,
    dirty: new Set<string>(),
    resetKeys: {} as Record<string, number>,
  }));

  // Shorthand accessors for render
  const { values, dirty, resetKeys } = displayState;

  // Search / filter query
  const [search, setSearch] = React.useState("");

  // Preview state
  const [previewContext, setPreviewContext] = React.useState<PreviewContext>("home");
  const [previewDevice, setPreviewDevice] = React.useState<"desktop" | "mobile">("desktop");
  const [fullscreenPreviewOpen, setFullscreenPreviewOpen] = React.useState(false);

  // Debounced flush: batch ref snapshots into a single state update
  const scheduleFlush = React.useCallback(() => {
    clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      setDisplayState((prev) => ({
        ...prev,
        values: { ...valuesRef.current },
        dirty: new Set(dirtyRef.current),
      }));
    }, 300);
  }, []);

  // Cleanup debounce timer on unmount
  React.useEffect(() => {
    return () => clearTimeout(flushTimerRef.current);
  }, []);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const allEntries = React.useMemo(
    () =>
      Object.entries(values).map(([key, value]) => ({ key, value })),
    [values]
  );

  // Apply search filter
  const filteredEntries = React.useMemo(() => {
    if (!search.trim()) return allEntries;
    const q = search.toLowerCase();
    return allEntries.filter(
      (e) => e.key.toLowerCase().includes(q) || e.value.toLowerCase().includes(q)
    );
  }, [allEntries, search]);

  const groups = React.useMemo(() => groupEntries(filteredEntries), [filteredEntries]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleValueChange = React.useCallback(
    (key: string, value: string) => {
      // Instant ref updates — ZERO re-renders
      valuesRef.current[key] = value;
      if (savedValues[key] === value) {
        dirtyRef.current.delete(key);
      } else {
        dirtyRef.current.add(key);
      }

      // Single debounced state flush (300ms after last keystroke)
      scheduleFlush();
    },
    [savedValues, scheduleFlush]
  );

  const handleResetField = React.useCallback(
    (key: string) => {
      const original = savedValues[key] ?? "";
      valuesRef.current[key] = original;
      dirtyRef.current.delete(key);
      // Immediate flush + remount only the affected field
      setDisplayState((prev) => ({
        values: { ...valuesRef.current },
        dirty: new Set(dirtyRef.current),
        resetKeys: { ...prev.resetKeys, [key]: (prev.resetKeys[key] ?? 0) + 1 },
      }));
    },
    [savedValues]
  );

  function handleResetAll() {
    valuesRef.current = { ...savedValues };
    dirtyRef.current = new Set();
    // Bump all reset keys so all fields remount
    const bumpedKeys: Record<string, number> = {};
    for (const key of Object.keys(savedValues)) {
      bumpedKeys[key] = (displayState.resetKeys[key] ?? 0) + 1;
    }
    setDisplayState({
      values: { ...savedValues },
      dirty: new Set(),
      resetKeys: bumpedKeys,
    });
    toast({ title: "รีเซ็ตแล้ว", description: "ยกเลิกการเปลี่ยนแปลงทั้งหมดแล้ว" });
  }

  const executeSave = React.useCallback(
    (keys: string[]) => {
      const current = valuesRef.current;
      const payload = keys.map((key) => ({ key, value: current[key] ?? "" }));
      startTransition(async () => {
        const result = await bulkUpdateSiteContent(payload);
        if (!result.success) {
          toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
          return;
        }
        for (const key of keys) {
          savedValues[key] = current[key] ?? "";
        }
        for (const key of keys) {
          dirtyRef.current.delete(key);
        }
        setDisplayState((prev) => ({
          ...prev,
          dirty: new Set(dirtyRef.current),
        }));
        toast({
          title: "บันทึกเนื้อหาแล้ว",
          description: `อัปเดต ${payload.length} รายการแล้ว`,
        });
        router.refresh();
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedValues, toast, router]
  );

  function handleSaveAll() {
    if (dirtyRef.current.size === 0) {
      toast({ title: "ไม่มีการเปลี่ยนแปลง", description: "ไม่มีอะไรต้องบันทึก" });
      return;
    }
    executeSave(Array.from(dirtyRef.current));
  }

  const handleSaveSection = React.useCallback(
    (prefix: string) => {
      const keysInSection = Array.from(dirtyRef.current).filter((k) => k.startsWith(prefix + ".") || k === prefix);
      if (keysInSection.length === 0) return;
      executeSave(keysInSection);
    },
    [executeSave]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-4">
      {/* ── Top toolbar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="ค้นหาคีย์หรือค่า..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
            aria-label="ค้นหาเนื้อหา"
          />
        </div>

        {/* Summary */}
        <p className="text-sm text-muted-foreground">
          {Object.keys(values).length} รายการ
          {dirty.size > 0 && (
            <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">
              ({dirty.size} ยังไม่ได้บันทึก)
            </span>
          )}
        </p>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Open fullscreen preview */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFullscreenPreviewOpen(true)}
          >
            <Eye className="mr-1.5 h-4 w-4" aria-hidden="true" />
            ดูตัวอย่าง
          </Button>

          {/* Reset all */}
          {dirty.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAll}
              disabled={isPending}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />
              รีเซ็ตทั้งหมด
            </Button>
          )}

          {/* Save all */}
          <Button
            size="sm"
            onClick={handleSaveAll}
            disabled={dirty.size === 0 || isPending}
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            บันทึกทั้งหมด
            {dirty.size > 0 && (
              <span className="ml-1.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                {dirty.size}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ── Editor pane (full width) ────────────────────────────────────── */}
      <div
        className="space-y-4"
        role="region"
        aria-label="ตัวแก้ไขเนื้อหา"
      >
        {groups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <FileText className="h-8 w-8 opacity-40" aria-hidden="true" />
              <p className="text-sm font-medium">
                {search.trim() ? "ไม่พบรายการที่ตรงกัน" : "ยังไม่มีรายการเนื้อหา"}
              </p>
              <p className="text-xs">
                {search.trim()
                  ? "ลองค้นหาด้วยคำอื่น"
                  : "กรุณาตรวจสอบข้อมูล seed — รายการเนื้อหาจะถูกสร้างจากเทมเพลตอัตโนมัติ"}
              </p>
            </CardContent>
          </Card>
        ) : (
          groups.map((group) => (
            <ContentSection
              key={group.prefix}
              group={group}
              values={values}
              dirty={dirty}
              savedValues={savedValues}
              onValueChange={handleValueChange}
              onResetField={handleResetField}
              onSaveSection={handleSaveSection}
              isSaving={isPending}
              resetKeys={resetKeys}
            />
          ))
        )}
      </div>

      {/* ── Fullscreen Preview Dialog ────────────────────────────────────── */}
      <Dialog open={fullscreenPreviewOpen} onOpenChange={setFullscreenPreviewOpen}>
        <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0 gap-0 sm:rounded-xl">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>ตัวอย่างเนื้อหา</DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  ดูตัวอย่างเนื้อหาแบบเต็มหน้าจอ — สลับมุมมองเดสก์ท็อปและมือถือ
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <ContentPreview
              values={values}
              activeContext={previewContext}
              onContextChange={setPreviewContext}
              device={previewDevice}
              onDeviceChange={setPreviewDevice}
              fullscreen
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

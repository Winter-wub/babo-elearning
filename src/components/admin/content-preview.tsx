"use client";

import * as React from "react";
import DOMPurify from "dompurify";
import {
  GraduationCap,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type PreviewContext = "home" | "footer" | "content";

interface ContentPreviewProps {
  values: Record<string, string>;
  activeContext: PreviewContext;
  onContextChange: (ctx: PreviewContext) => void;
  device?: "desktop" | "mobile";
  onDeviceChange?: (d: "desktop" | "mobile") => void;
  /** When true, renders at full size (inside fullscreen dialog) */
  fullscreen?: boolean;
}

// -----------------------------------------------------------------------
// Fallback defaults (mirrors what the live site uses)
// -----------------------------------------------------------------------

const DEFAULTS: Record<string, string> = {
  "footer.about.heading": "เกี่ยวกับ",
  "footer.about.description":
    "แพลตฟอร์มอีเลิร์นนิงมอบคอร์สวิดีโอจากผู้เชี่ยวชาญด้านการเงิน การลงทุน และการวางแผนภาษี ช่วยให้คุณสร้างความรู้ที่ยั่งยืนตามจังหวะของคุณ",
  "footer.about.address": "123 Learning Street,\nBangkok, Thailand 10110",
  "footer.copyright": "แพลตฟอร์มอีเลิร์นนิง สงวนลิขสิทธิ์",
};

// Slide background classes matching hero-slides.ts
const SLIDE_BG_CLASSES = [
  "from-primary/20 via-primary/10 to-background",
  "from-blue-500/20 via-blue-400/10 to-background",
  "from-emerald-500/20 via-emerald-400/10 to-background",
];

const CONTEXT_TABS: { id: PreviewContext; label: string }[] = [
  { id: "home", label: "หน้าแรก" },
  { id: "footer", label: "ส่วนท้าย" },
  { id: "content", label: "เนื้อหา" },
];

// -----------------------------------------------------------------------
// Phone frame component
// -----------------------------------------------------------------------

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center py-4">
      <div className="w-[375px] rounded-[2.5rem] border-[3px] border-foreground/20 bg-background shadow-xl overflow-hidden">
        {/* Status bar */}
        <div className="flex items-center justify-between px-6 py-2 bg-background">
          <span className="text-[10px] font-medium text-foreground/60">9:41</span>
          {/* Dynamic Island */}
          <div className="h-[22px] w-[90px] rounded-full bg-foreground/10" />
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-sm bg-foreground/40" />
            <div className="h-2.5 w-4 rounded-sm bg-foreground/40" />
          </div>
        </div>
        {/* Content viewport */}
        <div className="h-[680px] overflow-y-auto bg-background">
          {children}
        </div>
        {/* Home indicator */}
        <div className="flex justify-center py-2 bg-background">
          <div className="h-1 w-[120px] rounded-full bg-foreground/20" />
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Sub-previews
// -----------------------------------------------------------------------

/** Mini-preview of the public home hero carousel */
function HomePreview({ values }: { values: Record<string, string> }) {
  const [slide, setSlide] = React.useState(0);

  function c(key: string): string {
    return values[key] ?? DEFAULTS[key] ?? "";
  }

  const slides = [
    {
      headline: c("hero.slide1.headline") || "เรียนรู้ตามจังหวะของคุณ",
      sub: c("hero.slide1.sub") || "คอร์สวิดีโอคัดสรรจากผู้เชี่ยวชาญในอุตสาหกรรม",
      cta: c("hero.slide1.cta") || "ดูคอร์สเรียน",
      bg: SLIDE_BG_CLASSES[0],
    },
    {
      headline: c("hero.slide2.headline") || "สร้างทักษะการเงินที่แท้จริง",
      sub: c("hero.slide2.sub") || "ตั้งแต่การลงทุนเบื้องต้นจนถึงการวางแผนภาษีขั้นสูง",
      cta: c("hero.slide2.cta") || "เริ่มต้นเลย",
      bg: SLIDE_BG_CLASSES[1],
    },
    {
      headline: c("hero.slide3.headline") || "เรียนรู้กับผู้เชี่ยวชาญ",
      sub: c("hero.slide3.sub") || "เพลย์ลิสต์ที่จัดโครงสร้างเพื่อเป้าหมายของคุณ",
      cta: c("hero.slide3.cta") || "ดูเพลย์ลิสต์",
      bg: SLIDE_BG_CLASSES[2],
    },
  ];

  const current = slides[slide];

  return (
    <div className="space-y-3">
      {/* Header strip */}
      <div className="rounded-lg border border-border bg-background px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <GraduationCap className="h-4 w-4 text-foreground" aria-hidden="true" />
          <span className="text-sm font-semibold text-foreground">
            {c("app.name") || "อีเลิร์นนิง"}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {["หน้าแรก", "เกี่ยวกับเรา", "คำถามที่พบบ่อย"].map((item) => (
            <span key={item} className="text-xs text-muted-foreground">
              {item}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
            เข้าสู่ระบบ
          </span>
          <span className="rounded-md bg-foreground px-2 py-0.5 text-xs text-background">
            สมัครสมาชิก
          </span>
        </div>
      </div>

      {/* Hero carousel */}
      <div
        className={cn(
          "relative rounded-lg overflow-hidden bg-gradient-to-br transition-all duration-500",
          current.bg
        )}
      >
        <div className="px-6 py-10 text-center">
          <h2 className="text-xl font-bold tracking-tight text-foreground leading-snug">
            {current.headline}
          </h2>
          <div
            className="mt-2 text-xs leading-relaxed text-foreground/70 max-w-xs mx-auto prose-preview-xs"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(current.sub) }}
          />
          <div className="mt-4 inline-flex items-center rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">
            {current.cta}
            <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
          </div>
        </div>

        {/* Prev/Next */}
        <button
          type="button"
          onClick={() => setSlide((s) => (s - 1 + slides.length) % slides.length)}
          aria-label="สไลด์ก่อนหน้า"
          className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 shadow text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setSlide((s) => (s + 1) % slides.length)}
          aria-label="สไลด์ถัดไป"
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 shadow text-foreground"
        >
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 pb-3">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlide(i)}
              aria-label={`ไปที่สไลด์ ${i + 1}`}
              className={cn(
                "block h-1.5 rounded-full transition-all duration-300",
                i === slide ? "w-4 bg-foreground" : "w-1.5 bg-foreground/30"
              )}
            />
          ))}
        </div>
      </div>

      {/* Placeholder content area */}
      <div className="rounded-lg border border-dashed border-border p-4 text-center">
        <p className="text-xs text-muted-foreground">
          ส่วนคอร์สและวิดีโอ (ไม่สามารถแก้ไขได้จากหน้านี้)
        </p>
      </div>
    </div>
  );
}

/** Mini-preview of the public site footer */
function FooterPreview({ values }: { values: Record<string, string> }) {
  function c(key: string): string {
    return values[key] ?? DEFAULTS[key] ?? "";
  }

  const year = new Date().getFullYear();

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="px-5 pt-8 pb-5">
        {/* 3-column footer grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Static columns */}
          {[
            {
              heading: "เมนู",
              links: ["หน้าแรก", "คอร์สเรียน", "เกี่ยวกับเรา", "คำถามที่พบบ่อย"],
            },
            {
              heading: "ศูนย์ช่วยเหลือ",
              links: ["ติดต่อเรา", "คำถามที่พบบ่อย", "นโยบายความเป็นส่วนตัว", "ข้อกำหนดการใช้งาน"],
            },
          ].map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-semibold text-foreground">{col.heading}</p>
              <ul className="mt-2 space-y-1.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <span className="text-[11px] text-muted-foreground">{link}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* CMS about column */}
          <div>
            <p className="text-xs font-semibold text-foreground">
              {c("footer.about.heading")}
            </p>
            <div
              className="mt-2 text-[11px] leading-relaxed text-muted-foreground prose-preview-xs"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(c("footer.about.description")) }}
            />
            <p className="mt-2 text-[11px] text-muted-foreground whitespace-pre-line">
              {c("footer.about.address")}
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <p className="text-[10px] text-muted-foreground">
            &copy; {year} {c("footer.copyright")}
          </p>
          <div className="flex gap-3">
            <span className="text-[10px] text-muted-foreground">ความเป็นส่วนตัว</span>
            <span className="text-[10px] text-muted-foreground">ข้อกำหนด</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Rich-text content preview — renders all description/content/body keys as styled HTML */
function RichContentPreview({ values }: { values: Record<string, string> }) {
  const RICH_KEYS = ["description", "content", "body", "about", "text", "detail"];
  const richEntries = Object.entries(values)
    .filter(([key]) => RICH_KEYS.some((k) => key.includes(k)))
    .filter(([, value]) => value && value !== "<p></p>");

  if (richEntries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <p className="text-xs text-muted-foreground">
          ยังไม่มีเนื้อหา Rich Text — เริ่มพิมพ์ในตัวแก้ไขเพื่อดูตัวอย่าง
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Simulated page frame */}
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        {/* Page title bar */}
        <div className="border-b border-border bg-muted/30 px-4 py-2 flex items-center gap-2">
          <div className="flex gap-1">
            <div className="h-2 w-2 rounded-full bg-red-400" />
            <div className="h-2 w-2 rounded-full bg-yellow-400" />
            <div className="h-2 w-2 rounded-full bg-green-400" />
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            ตัวอย่างเนื้อหา Rich Text
          </span>
        </div>

        {/* Content area */}
        <div className="px-5 py-4 space-y-4">
          {richEntries.map(([key, value]) => (
            <div key={key}>
              <p className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {key}
              </p>
              <div
                className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-sm prose-headings:font-semibold prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs prose-blockquote:text-xs prose-a:text-primary"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Preview content renderer (shared between desktop and mobile)
// -----------------------------------------------------------------------

function PreviewContent({
  activeContext,
  values,
}: {
  activeContext: PreviewContext;
  values: Record<string, string>;
}) {
  return (
    <>
      {activeContext === "home" && <HomePreview values={values} />}
      {activeContext === "footer" && <FooterPreview values={values} />}
      {activeContext === "content" && <RichContentPreview values={values} />}
    </>
  );
}

// -----------------------------------------------------------------------
// Main preview component
// -----------------------------------------------------------------------

export function ContentPreview({
  values,
  activeContext,
  onContextChange,
  device = "desktop",
  onDeviceChange,
  fullscreen,
}: ContentPreviewProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Context tab bar */}
      <div
        className="mb-3 flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1"
        role="tablist"
        aria-label="เลือกหน้าตัวอย่าง"
      >
        {CONTEXT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeContext === tab.id}
            onClick={() => onContextChange(tab.id)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeContext === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Device toggle */}
      {onDeviceChange && (
        <div
          className="mb-3 flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1"
          role="radiogroup"
          aria-label="เลือกอุปกรณ์ตัวอย่าง"
        >
          <button
            type="button"
            role="radio"
            aria-checked={device === "desktop"}
            onClick={() => onDeviceChange("desktop")}
            className={cn(
              "flex items-center justify-center gap-1.5 flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              device === "desktop"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
            เดสก์ท็อป
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={device === "mobile"}
            onClick={() => onDeviceChange("mobile")}
            className={cn(
              "flex items-center justify-center gap-1.5 flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              device === "mobile"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
            มือถือ
          </button>
        </div>
      )}

      {/* Preview frame label */}
      <div className="mb-3 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
        <span className="text-xs font-medium text-muted-foreground">
          ตัวอย่างสด — อัปเดตขณะพิมพ์
        </span>
      </div>

      {/* Preview content */}
      <div
        className={cn(
          "flex-1 overflow-y-auto rounded-xl border border-border bg-muted/20",
          device === "mobile" ? "p-2" : "p-4"
        )}
      >
        {device === "mobile" ? (
          <PhoneFrame>
            <div className="p-3">
              <PreviewContent activeContext={activeContext} values={values} />
            </div>
          </PhoneFrame>
        ) : fullscreen ? (
          <div className="mx-auto max-w-4xl">
            <PreviewContent activeContext={activeContext} values={values} />
          </div>
        ) : (
          <PreviewContent activeContext={activeContext} values={values} />
        )}
      </div>

      {/* Disclaimer */}
      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        ตัวอย่างอาจแตกต่างจากหน้าจริงเล็กน้อย
      </p>
    </div>
  );
}

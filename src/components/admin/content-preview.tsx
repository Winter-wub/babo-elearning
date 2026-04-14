"use client";

import * as React from "react";
import DOMPurify from "dompurify";
import {
  GraduationCap,
  ArrowRight,
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

/** Mini-preview of the public home hero (static, IELTS Advantage-style) */
function HomePreview({ values }: { values: Record<string, string> }) {
  function c(key: string): string {
    return values[key] ?? DEFAULTS[key] ?? "";
  }

  const badge = c("hero.badge") || "นักเรียนกว่า 500 คนเรียนกับ Gift แล้ว";
  const headline1 = c("hero.headline1") || "อยากเก่งภาษาอังกฤษแต่ไม่รู้จะเริ่มจากไหน?";
  const headline2 = c("hero.headline2") || "เราจะพาคุณไปถึงเป้าหมาย";
  const body = c("hero.body") || "ทดสอบระดับภาษาอังกฤษของคุณฟรี รู้ว่าจุดอ่อนอยู่ที่ไหน";
  const ctaLabel = c("hero.ctaLabel") || "เริ่มทดสอบฟรีเลย";
  const ctaMicro = c("hero.ctaMicro") || "ไม่ต้องเสียค่าใช้จ่าย ทดสอบได้เลย";
  const cta2Label = c("hero.cta2Label");
  const bgColor = c("hero.bgColor") || "#0f172a";

  const stat1Num = c("hero.stat1.number") || "500+";
  const stat1Label = c("hero.stat1.label") || "นักเรียน";
  const stat2Num = c("hero.stat2.number") || "4.9";
  const stat2Label = c("hero.stat2.label") || "คะแนนเฉลี่ย";
  const stat3Num = c("hero.stat3.number") || "10+";
  const stat3Label = c("hero.stat3.label") || "แบบทดสอบ";

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

      {/* Static hero section */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(bgColor) ? bgColor : "#0f172a" }}
      >
        <div className="px-6 py-10 text-center flex flex-col items-center">
          {/* Trust badge */}
          {badge && (
            <span className="mb-4 inline-flex items-center rounded-full bg-amber-500/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
              {badge}
            </span>
          )}

          {/* Two-line headline */}
          <h2 className="text-lg font-bold leading-snug tracking-tight">
            <span className="block text-white">{headline1}</span>
            <span className="block text-amber-400">{headline2}</span>
          </h2>

          {/* Body */}
          {body && (
            <p className="mt-2 max-w-xs text-[11px] leading-relaxed text-slate-300">
              {body}
            </p>
          )}

          {/* Primary CTA */}
          <div className="mt-4 inline-flex items-center rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white">
            {ctaLabel}
            <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
          </div>

          {/* Micro-text */}
          {ctaMicro && (
            <p className="mt-1.5 text-[10px] text-slate-400">{ctaMicro}</p>
          )}

          {/* Secondary CTA */}
          {cta2Label && (
            <p className="mt-1 text-[10px] text-slate-300 underline underline-offset-2">
              {cta2Label}
            </p>
          )}

          {/* Stats strip */}
          <div className="mt-6 grid w-full max-w-[280px] grid-cols-3 gap-3 border-t border-slate-700 pt-4">
            {[
              { num: stat1Num, label: stat1Label },
              { num: stat2Num, label: stat2Label },
              { num: stat3Num, label: stat3Label },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center">
                <span className="text-sm font-bold text-white">{stat.num}</span>
                <span className="text-[9px] text-slate-400">{stat.label}</span>
              </div>
            ))}
          </div>
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

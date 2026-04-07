import type { Metadata } from "next";
import {
  BookOpen,
  Layers,
  ClipboardCheck,
  BarChart3,
  Monitor,
  CheckCircle,
} from "lucide-react";
import { getSiteContent } from "@/actions/content.actions";
import { APP_NAME } from "@/lib/constants";
import { getDeploymentTenantId } from "@/lib/tenant";

export const metadata: Metadata = {
  title: "เกี่ยวกับเรา",
  description: `เรียนรู้เพิ่มเติมเกี่ยวกับ ${APP_NAME} — พันธกิจ จุดเด่นของแพลตฟอร์ม และวิธีที่เราช่วยให้คุณสร้างทักษะที่ใช้ได้จริง`,
};

// Keys we fetch from SiteContent with their fallback defaults
const CONTENT_KEYS: Record<string, string> = {
  "about.hero.title": "เกี่ยวกับแพลตฟอร์มของเรา",
  "about.hero.subtitle":
    "เรามอบคอร์สออนไลน์ที่ครอบคลุมและจัดทำโดยผู้เชี่ยวชาญ ออกแบบมาเพื่อช่วยให้คุณสร้างทักษะที่ใช้ได้จริงตามจังหวะของคุณเอง แพลตฟอร์มของเรารวมบทเรียนที่มีโครงสร้าง แบบทดสอบ และการติดตามความก้าวหน้าไว้ในประสบการณ์การเรียนรู้ที่ไร้รอยต่อ",
  "about.highlight.1.title": "ครอบคลุมความรู้อย่างครบถ้วน",
  "about.highlight.1.desc":
    "คอร์สของเราครอบคลุมเนื้อหาตั้งแต่พื้นฐานไปจนถึงการประยุกต์ใช้ขั้นสูง เพื่อให้คุณเข้าใจแต่ละวิชาอย่างถ่องแท้",
  "about.highlight.2.title": "แบ่งเป็นบทเรียนย่อย",
  "about.highlight.2.desc":
    "ทุกคอร์สถูกแบ่งเป็นบทเรียนสั้นๆ ที่เน้นเนื้อหาเฉพาะ เพื่อให้คุณเรียนรู้ได้อย่างมีประสิทธิภาพในแต่ละช่วงเวลาสั้นๆ — เหมาะสำหรับผู้ที่มีตารางงานยุ่ง",
  "about.highlight.3.title": "มีแบบทดสอบประเมินผล",
  "about.highlight.3.desc":
    "แต่ละโมดูลมาพร้อมกับแบบทดสอบและแบบฝึกหัดเพื่อเสริมสร้างความเข้าใจและวัดความก้าวหน้าของคุณตลอดเส้นทางการเรียนรู้",
  "about.highlight.4.title": "ติดตามความก้าวหน้าในการเรียนรู้",
  "about.highlight.4.desc":
    "แดชบอร์ดส่วนตัวช่วยให้คุณเห็นว่าเรียนถึงไหนแล้ว ติดตามเปอร์เซ็นต์ความสำเร็จ และฉลองเมื่อบรรลุเป้าหมาย",
  "about.highlight.5.title": "รองรับหลายอุปกรณ์",
  "about.highlight.5.desc":
    "เข้าถึงคอร์สเรียนได้ทั้งบนเดสก์ท็อป แท็บเล็ต หรือมือถือ ความก้าวหน้าของคุณจะซิงค์อัตโนมัติในทุกอุปกรณ์",
  "about.requirements.title": "ความต้องการของระบบ",
  "about.requirements.content":
    "เว็บเบราว์เซอร์สมัยใหม่ (Chrome, Firefox, Safari หรือ Edge) และการเชื่อมต่ออินเทอร์เน็ตที่เสถียร ไม่จำเป็นต้องติดตั้งซอฟต์แวร์เพิ่มเติม",
  "about.certification.title": "กระบวนการรับรอง",
  "about.certification.content":
    "เรียนบทเรียนทั้งหมดให้ครบและผ่านแบบทดสอบสุดท้ายด้วยคะแนน 80% ขึ้นไป เพื่อรับใบรับรองการสำเร็จหลักสูตร ซึ่งสามารถดาวน์โหลดเป็นไฟล์ PDF ได้",
};

const HIGHLIGHT_ICONS = [
  BookOpen,
  Layers,
  ClipboardCheck,
  BarChart3,
  Monitor,
] as const;

export default async function AboutPage() {
  const tenantId = await getDeploymentTenantId();
  const content = await getSiteContent(Object.keys(CONTENT_KEYS), tenantId);

  // Helper: resolve content from DB or fall back to default
  function c(key: string): string {
    return content[key] ?? CONTENT_KEYS[key] ?? "";
  }

  const highlights = Array.from({ length: 5 }, (_, i) => ({
    icon: HIGHLIGHT_ICONS[i],
    title: c(`about.highlight.${i + 1}.title`),
    description: c(`about.highlight.${i + 1}.desc`),
  }));

  return (
    <>
      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {c("about.hero.title")}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-primary-foreground/80">
            {c("about.hero.subtitle")}
          </p>
        </div>
      </section>

      {/* ── Two-Column Body ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
          {/* LEFT — Key Highlights (3/5 width) */}
          <div className="lg:col-span-3">
            <h2 className="text-2xl font-semibold text-foreground">
              จุดเด่นของแพลตฟอร์ม
            </h2>
            <ul className="mt-8 space-y-8">
              {highlights.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <li key={idx} className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon
                        className="h-6 w-6 text-primary"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-foreground">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* RIGHT — Info Boxes (2/5 width) */}
          <div className="space-y-8 lg:col-span-2">
            {/* System Requirements */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
                <Monitor
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                />
                {c("about.requirements.title")}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {c("about.requirements.content")}
              </p>
            </div>

            {/* Certification Process */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
                <CheckCircle
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                />
                {c("about.certification.title")}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {c("about.certification.content")}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="rounded-lg border border-border bg-primary/5 p-6">
              <h3 className="text-lg font-semibold text-foreground">
                ทำไมต้องเลือกเรา
              </h3>
              <ul className="mt-4 space-y-3">
                {[
                  "เนื้อหาคอร์สคัดสรรโดยผู้เชี่ยวชาญ",
                  "เรียนรู้ตามจังหวะของคุณ ได้ทุกเวลา",
                  "รับใบรับรองเมื่อสำเร็จหลักสูตร",
                  "ติดตามความก้าวหน้าได้ทุกอุปกรณ์",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

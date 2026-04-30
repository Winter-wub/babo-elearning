import type { Metadata } from "next";
import { Mail, Phone, MapPin, ExternalLink } from "lucide-react";
import { LineIcon } from "@/components/icons/line-icon";
import { getSiteContent } from "@/actions/content.actions";
import { ContactForm } from "@/components/contact/ContactForm";
import { isSafeHref } from "@/lib/utils";

export const metadata: Metadata = {
  title: "ติดต่อเรา",
  description:
    "ติดต่อทีมงานของเรา เราพร้อมช่วยเหลือทุกคำถามเกี่ยวกับคอร์สเรียน บัญชีผู้ใช้ หรือความร่วมมือ",
};

const CONTACT_KEYS: Record<string, string> = {
  "contact.email": "support@elearning.example.com",
  "contact.phone": "+66 2 123 4567",
  "contact.address": "123 Learning Street, Bangkok, Thailand 10110",
  "contact.line.url": "",
  "contact.hero.title": "ติดต่อเรา",
  "contact.hero.subtitle":
    "มีคำถามหรือข้อเสนอแนะ? เรายินดีรับฟังจากคุณ กรอกแบบฟอร์มหรือติดต่อเราผ่านช่องทางด้านล่าง",
};

export default async function ContactPage() {
  const content = await getSiteContent(Object.keys(CONTACT_KEYS));

  function c(key: string): string {
    return content[key] ?? CONTACT_KEYS[key] ?? "";
  }

  return (
    <>
      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {c("contact.hero.title")}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-primary-foreground/80">
            {c("contact.hero.subtitle")}
          </p>
        </div>
      </section>

      {/* ── Two-Column Layout ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
          {/* LEFT — Contact Info (2/5 width) */}
          <div className="space-y-8 lg:col-span-2">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                ติดต่อเรา
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                ทีมสนับสนุนของเราจะตอบกลับภายใน 24 ชั่วโมงในวันทำการ
              </p>
            </div>

            <div className="space-y-6">
              {/* Email */}
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Mail
                    className="h-5 w-5 text-primary"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">อีเมล</p>
                  <a
                    href={`mailto:${c("contact.email")}`}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {c("contact.email")}
                  </a>
                </div>
              </div>

              {/* Phone */}
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Phone
                    className="h-5 w-5 text-primary"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">โทรศัพท์</p>
                  <a
                    href={`tel:${c("contact.phone").replace(/\s/g, "")}`}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {c("contact.phone")}
                  </a>
                </div>
              </div>

              {/* Address */}
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin
                    className="h-5 w-5 text-primary"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">ที่อยู่</p>
                  <p className="text-sm text-muted-foreground">
                    {c("contact.address")}
                  </p>
                </div>
              </div>

              {/* LINE */}
              {c("contact.line.url") && isSafeHref(c("contact.line.url")) && (
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#06C755]/10">
                    <LineIcon
                      className="h-5 w-5 text-[#06C755]"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">LINE</p>
                    <a
                      href={c("contact.line.url")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      สอบถามข้อมูลทาง LINE
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* LINE CTA Card */}
            {c("contact.line.url") && isSafeHref(c("contact.line.url")) && (
              <div className="rounded-lg border border-[#06C755]/30 bg-[#06C755]/5 p-6">
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#06C755] px-2.5 py-0.5 text-xs font-bold text-white">
                    <LineIcon className="h-3.5 w-3.5" />
                    LINE
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  สอบถามรายละเอียดเพิ่มเติม
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  แอดไลน์เพื่อสอบถามข้อมูลคอร์สเรียน หรือปรึกษาเรื่องการเลือกคอร์สที่เหมาะกับคุณ
                </p>
                <a
                  href={c("contact.line.url")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#06C755] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  <LineIcon className="h-4 w-4" />
                  เพิ่มเพื่อนทาง LINE
                </a>
              </div>
            )}

            {/* Operating Hours */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-card-foreground">
                เวลาทำการ
              </h3>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <p>จันทร์ - ศุกร์: 9:00 - 18:00 น. (เวลาประเทศไทย)</p>
                <p>เสาร์: 10:00 - 16:00 น.</p>
                <p>อาทิตย์: ปิดทำการ</p>
              </div>
            </div>
          </div>

          {/* RIGHT — Contact Form (3/5 width) */}
          <div className="lg:col-span-3">
            <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-card-foreground">
                ส่งข้อความถึงเรา
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                กรอกแบบฟอร์มด้านล่าง แล้วเราจะติดต่อกลับโดยเร็วที่สุด
              </p>
              <div className="mt-6">
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

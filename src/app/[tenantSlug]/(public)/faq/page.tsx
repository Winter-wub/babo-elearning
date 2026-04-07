import type { Metadata } from "next";
import { HelpCircle } from "lucide-react";
import { getActiveFaqs } from "@/actions/faq.actions";
import { FaqList } from "@/components/faq/FaqList";

export const metadata: Metadata = {
  title: "คำถามที่พบบ่อย",
  description:
    "ค้นหาคำตอบสำหรับคำถามที่พบบ่อยเกี่ยวกับแพลตฟอร์มอีเลิร์นนิง คอร์สเรียน และใบรับรองของเรา",
};

export default async function FaqPage() {
  const faqs = await getActiveFaqs();

  return (
    <>
      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-8 w-8" aria-hidden="true" />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              คำถามที่พบบ่อย
            </h1>
          </div>
          <p className="mt-4 max-w-2xl text-lg text-primary-foreground/80">
            มีคำถาม? เรียกดูคำถามที่พบบ่อยด้านล่าง
            หากไม่พบสิ่งที่คุณกำลังมองหา สามารถติดต่อเราได้เลย
          </p>
        </div>
      </section>

      {/* ── FAQ Accordion ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {faqs.length > 0 ? (
          <FaqList faqs={faqs} />
        ) : (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <HelpCircle
              className="mx-auto h-10 w-10 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="mt-4 text-muted-foreground">
              ยังไม่มีคำถามที่พบบ่อยในขณะนี้ กรุณากลับมาตรวจสอบอีกครั้งภายหลัง
            </p>
          </div>
        )}
      </section>
    </>
  );
}

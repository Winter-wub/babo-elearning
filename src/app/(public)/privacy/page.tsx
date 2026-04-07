import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getSiteContent } from "@/actions/content.actions";
import { APP_NAME } from "@/lib/constants";
import { getDeploymentTenantId } from "@/lib/tenant";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว",
  description: `นโยบายความเป็นส่วนตัวของ ${APP_NAME} เรียนรู้วิธีที่เราเก็บรวบรวม ใช้ และปกป้องข้อมูลส่วนบุคคลของคุณ`,
};

const CONTENT_KEYS: Record<string, string> = {
  "privacy.title": "นโยบายความเป็นส่วนตัว",
  "privacy.content": `อัปเดตล่าสุด: 1 มกราคม 2569

1. ข้อมูลที่เราเก็บรวบรวม

เราเก็บรวบรวมข้อมูลที่คุณให้โดยตรงเมื่อสร้างบัญชี รวมถึงชื่อ อีเมล และรหัสผ่าน นอกจากนี้เรายังเก็บข้อมูลการใช้งาน เช่น ประวัติการรับชมวิดีโอและความก้าวหน้าของคอร์สเรียน

2. วิธีที่เราใช้ข้อมูลของคุณ

เราใช้ข้อมูลที่เก็บรวบรวมเพื่อ:
- ให้บริการ ดูแลรักษา และปรับปรุงบริการของเรา
- ดำเนินการลงทะเบียนบัญชีและจัดการบัญชีของคุณ
- ติดตามความก้าวหน้าในการเรียนรู้และออกใบรับรองการสำเร็จหลักสูตร
- ส่งประกาศทางเทคนิคและข้อความสนับสนุน
- ตอบกลับความคิดเห็น คำถาม และคำขอบริการลูกค้าของคุณ

3. ความปลอดภัยของข้อมูล

เราใช้มาตรการทางเทคนิคและองค์กรที่เหมาะสมเพื่อปกป้องความปลอดภัยของข้อมูลส่วนบุคคลของคุณ ข้อมูลทั้งหมดถูกส่งผ่านการเชื่อมต่อที่เข้ารหัส (TLS/SSL) และรหัสผ่านจะถูกจัดเก็บด้วยอัลกอริทึมแฮชตามมาตรฐานอุตสาหกรรม

4. การเก็บรักษาข้อมูล

เราเก็บรักษาข้อมูลส่วนบุคคลของคุณตราบเท่าที่บัญชีของคุณยังใช้งานอยู่หรือตามที่จำเป็นเพื่อให้บริการ คุณสามารถขอลบบัญชีและข้อมูลที่เกี่ยวข้องได้ทุกเมื่อโดยติดต่อเรา

5. คุกกี้

เราใช้คุกกี้ที่จำเป็นเพื่อรักษาเซสชันและการตั้งค่าของคุณ เราไม่ใช้คุกกี้ติดตามจากบุคคลที่สามหรือคุกกี้โฆษณา

6. บริการจากบุคคลที่สาม

เราใช้บริการจากบุคคลที่สามสำหรับการจัดเก็บและส่งมอบวิดีโอ บริการเหล่านี้อาจประมวลผลข้อมูลตามนโยบายความเป็นส่วนตัวของตนเอง

7. สิทธิ์ของคุณ

คุณมีสิทธิ์ในการ:
- เข้าถึงข้อมูลส่วนบุคคลของคุณ
- แก้ไขข้อมูลที่ไม่ถูกต้อง
- ขอลบข้อมูลของคุณ
- ส่งออกข้อมูลของคุณในรูปแบบที่พกพาได้

8. การเปลี่ยนแปลงนโยบายนี้

เราอาจอัปเดตนโยบายความเป็นส่วนตัวนี้เป็นครั้งคราว เราจะแจ้งให้คุณทราบถึงการเปลี่ยนแปลงใดๆ โดยเผยแพร่นโยบายใหม่บนหน้านี้และอัปเดตวันที่ "อัปเดตล่าสุด"

9. ติดต่อเรา

หากคุณมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ กรุณาติดต่อเราที่ support@elearning.com`,
};

export default async function PrivacyPage() {
  const tenantId = await getDeploymentTenantId();
  const content = await getSiteContent(Object.keys(CONTENT_KEYS), tenantId);

  function c(key: string): string {
    return content[key] ?? CONTENT_KEYS[key] ?? "";
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-primary/5 py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {c("privacy.title")}
          </h1>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="prose prose-sm max-w-none text-muted-foreground sm:prose-base">
            {c("privacy.content")
              .split("\n\n")
              .map((paragraph, i) => {
                const trimmed = paragraph.trim();
                if (!trimmed) return null;
                // Headings: lines starting with a number followed by a period
                if (/^\d+\./.test(trimmed)) {
                  return (
                    <h2
                      key={i}
                      className="mt-8 mb-3 text-lg font-semibold text-foreground"
                    >
                      {trimmed}
                    </h2>
                  );
                }
                // Bullet lists
                if (trimmed.startsWith("- ")) {
                  return (
                    <ul key={i} className="my-2 list-disc space-y-1 pl-6">
                      {trimmed.split("\n").map((line, j) => (
                        <li key={j}>{line.replace(/^- /, "")}</li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <p key={i} className="my-3 leading-relaxed">
                    {trimmed}
                  </p>
                );
              })}
          </div>
        </div>
      </section>
    </>
  );
}

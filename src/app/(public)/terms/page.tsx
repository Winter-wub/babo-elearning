import type { Metadata } from "next";
import { Scale } from "lucide-react";
import { getSiteContent } from "@/actions/content.actions";
import { APP_NAME } from "@/lib/constants";
import { getDeploymentTenantId } from "@/lib/tenant";

export const metadata: Metadata = {
  title: "ข้อกำหนดการใช้งาน",
  description: `ข้อกำหนดการใช้งานของ ${APP_NAME} กรุณาอ่านข้อกำหนดเหล่านี้อย่างละเอียดก่อนใช้งานแพลตฟอร์มของเรา`,
};

const CONTENT_KEYS: Record<string, string> = {
  "terms.title": "ข้อกำหนดการใช้งาน",
  "terms.content": `อัปเดตล่าสุด: 1 มกราคม 2569

1. การยอมรับข้อกำหนด

การเข้าถึงหรือใช้งานแพลตฟอร์มอีเลิร์นนิง ถือว่าคุณยอมรับข้อกำหนดการใช้งานเหล่านี้ หากคุณไม่ยอมรับข้อกำหนดเหล่านี้ กรุณาอย่าใช้บริการของเรา

2. การลงทะเบียนบัญชี

ในการเข้าถึงคอร์สวิดีโอ คุณต้องสร้างบัญชีด้วยอีเมลและรหัสผ่านที่ถูกต้อง คุณมีหน้าที่รับผิดชอบในการรักษาความลับของข้อมูลบัญชีและกิจกรรมทั้งหมดที่เกิดขึ้นภายใต้บัญชีของคุณ

3. การใช้เนื้อหา

คอร์สวิดีโอ สื่อการเรียน และเนื้อหาทั้งหมดบนแพลตฟอร์มนี้มีไว้เพื่อการศึกษาส่วนบุคคลที่ไม่ใช่เชิงพาณิชย์เท่านั้น คุณไม่สามารถ:
- ดาวน์โหลด คัดลอก หรือเผยแพร่เนื้อหาวิดีโอใดๆ
- แชร์ข้อมูลบัญชีของคุณกับผู้อื่น
- ใช้เครื่องมืออัตโนมัติเพื่อเข้าถึงหรือดึงข้อมูลเนื้อหา
- พยายามหลีกเลี่ยงการควบคุมการเข้าถึงหรือมาตรการรักษาความปลอดภัย

4. ทรัพย์สินทางปัญญา

เนื้อหาทั้งหมดบนแพลตฟอร์มนี้ รวมถึงวิดีโอ ข้อความ กราฟิก และซอฟต์แวร์ เป็นทรัพย์สินของแพลตฟอร์มอีเลิร์นนิงหรือผู้สร้างเนื้อหา และได้รับการคุ้มครองโดยกฎหมายลิขสิทธิ์และทรัพย์สินทางปัญญา

5. การเข้าถึงและสิทธิ์

การเข้าถึงวิดีโอจะได้รับจากผู้ดูแลระบบแบบรายวิดีโอหรือรายคอร์ส การเข้าถึงอาจเป็นแบบถาวรหรือจำกัดเวลาตามที่ระบุในขณะที่ให้สิทธิ์ สิทธิ์ที่หมดอายุจะเพิกถอนการเข้าถึงเนื้อหาที่เกี่ยวข้องโดยอัตโนมัติ

6. ความประพฤติของผู้ใช้

คุณยอมรับที่จะใช้แพลตฟอร์มอย่างมีความรับผิดชอบและจะไม่:
- ละเมิดกฎหมายหรือข้อบังคับที่เกี่ยวข้อง
- แทรกแซงหรือรบกวนแพลตฟอร์มหรือเซิร์ฟเวอร์
- พยายามเข้าถึงส่วนใดของแพลตฟอร์มโดยไม่ได้รับอนุญาต
- ใช้แพลตฟอร์มเพื่อวัตถุประสงค์ที่ฉ้อโกงหรือเป็นอันตราย

7. ข้อจำกัดความรับผิด

แพลตฟอร์มนี้ให้บริการ "ตามสภาพ" โดยไม่มีการรับประกันใดๆ เราจะไม่รับผิดชอบต่อความเสียหายทางอ้อม โดยบังเอิญ หรือที่เป็นผลสืบเนื่องจากการใช้งานแพลตฟอร์มของคุณ

8. การยุติบัญชี

เราขอสงวนสิทธิ์ในการระงับหรือยุติบัญชีของคุณได้ทุกเมื่อ หากละเมิดข้อกำหนดเหล่านี้หรือด้วยเหตุผลอื่นใดตามดุลยพินิจของเรา

9. การเปลี่ยนแปลงข้อกำหนด

เราอาจแก้ไขข้อกำหนดการใช้งานเหล่านี้ได้ทุกเมื่อ การใช้งานแพลตฟอร์มต่อไปหลังจากมีการเปลี่ยนแปลงถือว่ายอมรับข้อกำหนดที่แก้ไขแล้ว

10. ติดต่อ

หากมีคำถามเกี่ยวกับข้อกำหนดการใช้งานเหล่านี้ ติดต่อเราได้ที่ support@elearning.com`,
};

export default async function TermsPage() {
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
          <Scale className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {c("terms.title")}
          </h1>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="prose prose-sm max-w-none text-muted-foreground sm:prose-base">
            {c("terms.content")
              .split("\n\n")
              .map((paragraph, i) => {
                const trimmed = paragraph.trim();
                if (!trimmed) return null;
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

import type { Metadata } from "next";
import { getSiteContent } from "@/actions/content.actions";
import { APP_NAME } from "@/lib/constants";
import { Hero } from "@/components/about/Hero";
import { Bio } from "@/components/about/Bio";
import { IntroVideo } from "@/components/about/IntroVideo";
import { WhyLearnWithUs } from "@/components/about/WhyLearnWithUs";
import { StudentWins } from "@/components/about/StudentWins";
import { CtaBand } from "@/components/about/CtaBand";

// -----------------------------------------------------------------------
// CMS keys + Thai fallbacks
// -----------------------------------------------------------------------

const DEFAULT_HERO_TITLE = "เกี่ยวกับครูกิฟท์";
const DEFAULT_HERO_SUBTITLE =
  "ครูกิฟท์เชื่อว่าทุกคนสามารถพูดภาษาอังกฤษได้อย่างมั่นใจ ด้วยวิธีการสอนที่เป็นมิตร เข้าใจง่าย และปรับให้เหมาะกับผู้เรียนแต่ละคน มาเริ่มต้นการเดินทางภาษาอังกฤษของคุณไปด้วยกัน";

const CONTENT_KEYS: Record<string, string> = {
  // Hero
  "about.hero.title": DEFAULT_HERO_TITLE,
  "about.hero.subtitle": DEFAULT_HERO_SUBTITLE,
  "about.hero.photo": "",
  "about.hero.cta.label": "ดูคอร์สทั้งหมด",
  "about.hero.cta.href": "/courses",

  // Bio
  "about.bio.heading": "เรื่องราวของครูกิฟท์",
  "about.bio.p1":
    "ครูกิฟท์เริ่มต้นสอนภาษาอังกฤษเมื่อกว่า 5 ปีที่แล้ว จากความปรารถนาอยากให้นักเรียนไทยสามารถสื่อสารภาษาอังกฤษได้อย่างเป็นธรรมชาติ ไม่ใช่แค่ท่องจำโครงสร้างประโยค แต่เข้าใจการใช้ภาษาในชีวิตจริงอย่างแท้จริง",
  "about.bio.p2":
    "จบการศึกษาด้านภาษาอังกฤษและผ่านการรับรองในระดับ CEFR C2 พร้อมทั้งทำคะแนน TOEIC ได้ 990 คะแนนเต็ม ประสบการณ์สอนครอบคลุมทั้งนักศึกษา พนักงานออฟฟิศ และผู้เตรียมตัวสอบ ไม่ว่าจะเป็น IELTS, TOEIC หรือการสื่อสารในที่ทำงาน",
  "about.bio.p3":
    "สไตล์การสอนของครูกิฟท์เน้นความเข้าใจมากกว่าการท่องจำ ใช้สถานการณ์จริงเป็นสื่อการสอน และให้ feedback ที่ตรงไปตรงมาเพื่อให้นักเรียนพัฒนาได้เร็วที่สุด หลายร้อยคนที่ผ่านการเรียนกับครูกิฟท์ต่างสามารถก้าวข้ามอุปสรรคด้านภาษาได้อย่างมั่นใจ",
  "about.bio.badge1": "CEFR C2",
  "about.bio.badge2": "5+ ปีประสบการณ์สอน",
  "about.bio.badge3": "TOEIC 990",

  // Intro video
  "about.video.title": "วิดีโอแนะนำตัว",
  "about.video.subtitle": "ทำความรู้จักกับครูกิฟท์ก่อนเริ่มเรียน",
  "about.video.url": "",
  "about.video.poster": "",

  // Why learn with us (4 cards — reuses existing 1..4)
  "about.highlight.1.title": "เนื้อหาที่ใช้ได้จริง",
  "about.highlight.1.desc":
    "เรียนภาษาอังกฤษจากสถานการณ์ชีวิตประจำวัน ไม่ว่าจะเป็นการประชุม การเขียนอีเมล หรือการสนทนากับชาวต่างชาติ เน้นนำไปใช้ได้ทันที",
  "about.highlight.2.title": "หลักสูตรเป็นขั้นเป็นตอน",
  "about.highlight.2.desc":
    "เนื้อหาถูกออกแบบให้ต่อยอดทีละขั้น ตั้งแต่พื้นฐานจนถึงระดับสูง ไม่ต้องกังวลว่าจะตามไม่ทัน ครูกิฟท์ดูแลทุกระดับ",
  "about.highlight.3.title": "แบบฝึกหัดและ Feedback จริง",
  "about.highlight.3.desc":
    "ทุกบทเรียนมีแบบฝึกหัดและการให้คะแนน ครูกิฟท์ให้ feedback ที่ชัดเจน เพื่อให้รู้ว่าต้องปรับปรุงจุดไหน",
  "about.highlight.4.title": "ติดตามความก้าวหน้าได้",
  "about.highlight.4.desc":
    "ระบบติดตามพัฒนาการแบบ real-time ให้คุณเห็นความก้าวหน้าของตัวเอง และมีแรงจูงใจในการเรียนต่อเนื่องทุกวัน",

  // Student wins
  "about.win.1.name": "น้องพิม",
  "about.win.1.achievement": "TOEIC 860",
  "about.win.1.quote":
    "ก่อนเรียนกับครูกิฟท์ ไม่มั่นใจในตัวเองเลย แต่ตอนนี้สามารถประชุมกับลูกค้าต่างประเทศได้แล้ว",
  "about.win.1.photo": "",
  "about.win.2.name": "พี่เจมส์",
  "about.win.2.achievement": "IELTS 7.0",
  "about.win.2.quote":
    "ครูกิฟท์สอนแบบที่ทำให้เข้าใจจริงๆ ไม่ใช่แค่ท่องจำ ตอนนี้ได้ทุน ป.โท ต่างประเทศแล้ว",
  "about.win.2.photo": "",
  "about.win.3.name": "น้องฝน",
  "about.win.3.achievement": "TOEIC 945",
  "about.win.3.quote":
    "เรียนมาหลายที่แต่ยังพูดไม่ได้ พอมาเรียนกับครูกิฟท์แค่ 3 เดือนก็มั่นใจขึ้นมากเลย",
  "about.win.3.photo": "",

  // CTA band
  "about.cta.title": "พร้อมเริ่มต้นการเรียนหรือยัง?",
  "about.cta.subtitle":
    "เข้าร่วมกับนักเรียนกว่าหลายร้อยคนที่พัฒนาภาษาอังกฤษกับครูกิฟท์แล้ววันนี้",
};

// -----------------------------------------------------------------------
// Metadata — driven by CMS hero values when set
// -----------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent([
    "about.hero.title",
    "about.hero.subtitle",
  ]);

  // `||` (not `??`) — cleared keys upsert to "" and must fall through.
  const title =
    (content["about.hero.title"] || "").trim() ||
    `เกี่ยวกับเรา`;
  const description =
    (content["about.hero.subtitle"] || "").trim() ||
    `เรียนรู้เพิ่มเติมเกี่ยวกับ ${APP_NAME} — พันธกิจ จุดเด่นของแพลตฟอร์ม และวิธีที่เราช่วยให้คุณสร้างทักษะที่ใช้ได้จริง`;

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

export default async function AboutPage() {
  const content = await getSiteContent(Object.keys(CONTENT_KEYS));

  // `||` (not `??`) — cleared keys upsert to "" and should fall through
  // to the default so the page never renders a blank string in place of
  // a meaningful fallback. To intentionally hide a section, the admin
  // clears the default value AND the fallback empty-string entries
  // (e.g. `.photo`, `.video.url`) which the section filters honor.
  function c(key: string): string {
    return content[key] || CONTENT_KEYS[key] || "";
  }

  return (
    <>
      <Hero
        title={c("about.hero.title")}
        subtitle={c("about.hero.subtitle")}
        photo={c("about.hero.photo")}
        ctaLabel={c("about.hero.cta.label")}
        ctaHref={c("about.hero.cta.href")}
      />

      <Bio
        heading={c("about.bio.heading")}
        paragraphs={[c("about.bio.p1"), c("about.bio.p2"), c("about.bio.p3")]}
        badges={[
          c("about.bio.badge1"),
          c("about.bio.badge2"),
          c("about.bio.badge3"),
        ]}
      />

      <IntroVideo
        title={c("about.video.title")}
        subtitle={c("about.video.subtitle")}
        url={c("about.video.url")}
        poster={c("about.video.poster")}
      />

      <WhyLearnWithUs
        heading="ทำไมต้องเรียนกับครูกิฟท์"
        subheading="วิธีการสอนที่ออกแบบมาให้คุณเรียนรู้ได้จริง ไม่ใช่แค่ผ่านข้อสอบ"
        items={[1, 2, 3, 4].map((i) => ({
          title: c(`about.highlight.${i}.title`),
          desc: c(`about.highlight.${i}.desc`),
        }))}
      />

      <StudentWins
        heading="ความสำเร็จของนักเรียน"
        subheading="นักเรียนของครูกิฟท์ได้พิสูจน์แล้วว่าความพยายามและวิธีการสอนที่ถูกต้องเปลี่ยนชีวิตได้จริง"
        students={[1, 2, 3].map((i) => ({
          name: c(`about.win.${i}.name`),
          achievement: c(`about.win.${i}.achievement`),
          quote: c(`about.win.${i}.quote`),
          photo: c(`about.win.${i}.photo`),
        }))}
      />

      <CtaBand
        title={c("about.cta.title")}
        subtitle={c("about.cta.subtitle")}
      />
    </>
  );
}

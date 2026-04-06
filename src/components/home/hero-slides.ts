export type HeroSlide = {
  id: string;
  headline: string;
  subHeadline: string;
  ctaLabel: string;
  ctaHref: string;
  bgClass: string; // Tailwind gradient class applied to the slide background
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "1",
    headline: "เรียนรู้ตามจังหวะของคุณ",
    subHeadline: "คอร์สวิดีโอคัดสรรจากผู้เชี่ยวชาญในอุตสาหกรรม",
    ctaLabel: "ดูคอร์สเรียน",
    ctaHref: "#",
    bgClass: "from-primary/20 via-primary/10 to-background",
  },
  {
    id: "2",
    headline: "สร้างทักษะการเงินที่แท้จริง",
    subHeadline: "ตั้งแต่การลงทุนเบื้องต้นจนถึงการวางแผนภาษีขั้นสูง",
    ctaLabel: "เริ่มต้นเลย",
    ctaHref: "/register",
    bgClass: "from-blue-500/20 via-blue-400/10 to-background",
  },
  {
    id: "3",
    headline: "เรียนรู้กับผู้เชี่ยวชาญ",
    subHeadline: "เพลย์ลิสต์ที่จัดโครงสร้างเพื่อเป้าหมายของคุณ",
    ctaLabel: "ดูเพลย์ลิสต์",
    ctaHref: "#",
    bgClass: "from-emerald-500/20 via-emerald-400/10 to-background",
  },
];

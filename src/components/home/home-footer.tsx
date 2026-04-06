import Link from "next/link";
import { getSiteContent } from "@/actions/content.actions";

// Footer column definition type
interface FooterColumn {
  heading: string;
  links: { label: string; href: string }[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "เมนู",
    links: [
      { label: "หน้าแรก", href: "/" },
      { label: "คอร์สเรียน", href: "#" },
      { label: "เกี่ยวกับเรา", href: "/about" },
      { label: "คำถามที่พบบ่อย", href: "/faq" },
    ],
  },
  {
    heading: "ศูนย์ช่วยเหลือ",
    links: [
      { label: "ติดต่อเรา", href: "/contact" },
      { label: "คำถามที่พบบ่อย", href: "/faq" },
      { label: "นโยบายความเป็นส่วนตัว", href: "/privacy" },
      { label: "ข้อกำหนดการใช้งาน", href: "/terms" },
    ],
  },
];

// CMS keys with fallback defaults
const CONTENT_KEYS: Record<string, string> = {
  "footer.about.heading": "เกี่ยวกับ",
  "footer.about.description":
    "แพลตฟอร์มอีเลิร์นนิงมอบคอร์สวิดีโอจากผู้เชี่ยวชาญด้านการเงิน การลงทุน และการวางแผนภาษี ช่วยให้คุณสร้างความรู้ที่ยั่งยืนตามจังหวะของคุณ",
  "footer.about.address": "123 Learning Street,\nBangkok, Thailand 10110",
  "footer.copyright": "แพลตฟอร์มอีเลิร์นนิง สงวนลิขสิทธิ์",
};

export async function HomeFooter() {
  const content = await getSiteContent(Object.keys(CONTENT_KEYS));

  function c(key: string): string {
    return content[key] ?? CONTENT_KEYS[key] ?? "";
  }

  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 lg:px-8">

        {/* ── 3-column grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">

          {/* First two columns are generated from the data array */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-semibold text-foreground">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-2" role="list">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Third column — About / brand (CMS-configurable) */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {c("footer.about.heading")}
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {c("footer.about.description")}
            </p>
            <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">
              {c("footer.about.address")}
            </p>
          </div>
        </div>

        {/* ── Bottom bar ───────────────────────────────────────────────── */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {year} {c("footer.copyright")}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:underline"
            >
              ความเป็นส่วนตัว
            </Link>
            <Link
              href="/terms"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:underline"
            >
              ข้อกำหนด
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}

import Link from "next/link";
// lucide-react in this project does not bundle social-brand icons (Youtube, Twitter, etc.).
// We use SVG paths inline via a tiny wrapper so the footer layout is identical —
// swap these for real brand SVGs when the design system allows it.
import { Play, Globe, Rss, Share2 } from "lucide-react";

// Footer column definition type
interface FooterColumn {
  heading: string;
  links: { label: string; href: string }[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "Menu",
    links: [
      { label: "Home", href: "#" },
      { label: "Courses", href: "#" },
      { label: "About Us", href: "#" },
      { label: "FAQ", href: "#" },
      { label: "Glossary", href: "#" },
    ],
  },
  {
    heading: "Categories",
    links: [
      { label: "Finance", href: "#" },
      { label: "Investment", href: "#" },
      { label: "Tax Planning", href: "#" },
      { label: "Beginner", href: "#" },
      { label: "Retirement", href: "#" },
    ],
  },
  {
    heading: "Help Center",
    links: [
      { label: "Contact Us", href: "#" },
      { label: "FAQs", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Use", href: "#" },
    ],
  },
];

export function HomeFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 lg:px-8">

        {/* ── 4-column grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* First three columns are generated from the data array */}
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

          {/* Fourth column — About / brand */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">About</h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              E-Learning Platform delivers expert-led video courses on finance,
              investing, and tax planning — helping you build lasting knowledge
              at your own pace.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              123 Learning Street,<br />
              Bangkok, Thailand 10110
            </p>
          </div>
        </div>

        {/* ── Social icons row ─────────────────────────────────────────── */}
        <div className="mt-10 flex items-center justify-center gap-6">
          <a
            href="#"
            aria-label="YouTube"
            className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            {/* Play icon proxies for YouTube until brand icons are available */}
            <Play className="h-5 w-5" aria-hidden="true" />
          </a>
          <a
            href="#"
            aria-label="Twitter / X"
            className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <Rss className="h-5 w-5" aria-hidden="true" />
          </a>
          <a
            href="#"
            aria-label="LinkedIn"
            className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <Globe className="h-5 w-5" aria-hidden="true" />
          </a>
          <a
            href="#"
            aria-label="Facebook"
            className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <Share2 className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>

        {/* ── Bottom bar ───────────────────────────────────────────────── */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {year} E-Learning Platform. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="#"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:underline"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:underline"
            >
              Terms
            </Link>
            <Link
              href="#"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:underline"
            >
              Cookies
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}

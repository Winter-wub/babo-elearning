// -----------------------------------------------------------------------
// Hero section — CMS keys, defaults, types, and parser
// -----------------------------------------------------------------------

/**
 * All CMS keys consumed by the static hero section.
 * Used by `getSiteContent()` to fetch hero content in a single query.
 */
export const HERO_KEYS = [
  "hero.badge",
  "hero.headline1",
  "hero.headline2",
  "hero.body",
  "hero.ctaLabel",
  "hero.ctaHref",
  "hero.ctaMicro",
  "hero.cta2Label",
  "hero.cta2Href",
  "hero.stat1.number",
  "hero.stat1.label",
  "hero.stat2.number",
  "hero.stat2.label",
  "hero.stat3.number",
  "hero.stat3.label",
  "hero.bgColor",
] as const;

/**
 * Fallback values used when CMS keys are missing or empty.
 * These are also used as initial values in the admin hero editor.
 */
export const HERO_DEFAULTS: Record<string, string> = {
  "hero.badge": "นักเรียนกว่า 500 คนเรียนกับ Gift แล้ว",
  "hero.headline1": "อยากเก่งภาษาอังกฤษแต่ไม่รู้จะเริ่มจากไหน?",
  "hero.headline2": "เราจะพาคุณไปถึงเป้าหมาย",
  "hero.body":
    "ทดสอบระดับภาษาอังกฤษของคุณฟรี รู้ว่าจุดอ่อนอยู่ที่ไหน แล้วเรียนตามแผนที่ตรงกับคุณ",
  "hero.ctaLabel": "เริ่มทดสอบฟรีเลย",
  "hero.ctaHref": "/register",
  "hero.ctaMicro": "ไม่ต้องเสียค่าใช้จ่าย ทดสอบได้เลย",
  "hero.cta2Label": "ดูคอร์สทั้งหมด",
  "hero.cta2Href": "/playlists",
  "hero.stat1.number": "500+",
  "hero.stat1.label": "นักเรียน",
  "hero.stat2.number": "4.9",
  "hero.stat2.label": "คะแนนเฉลี่ย",
  "hero.stat3.number": "10+",
  "hero.stat3.label": "แบบทดสอบ",
  "hero.bgColor": "#0f172a", // slate-900
};

/** Typed representation of hero content for the component. */
export interface HeroContent {
  badge: string;
  headline1: string;
  headline2: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  ctaMicro: string;
  cta2Label: string;
  cta2Href: string;
  stat1Number: string;
  stat1Label: string;
  stat2Number: string;
  stat2Label: string;
  stat3Number: string;
  stat3Label: string;
  bgColor: string;
}

/** Validate that a string is a safe 6-digit hex color. */
function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

/** Validate that a href is safe (relative path or http/https URL). */
function isSafeHref(value: string): boolean {
  return value === "" || /^(\/|https?:\/\/)/.test(value);
}

/**
 * Parse a raw CMS key-value map into typed `HeroContent`.
 * Missing or empty values are replaced with defaults.
 * Unsafe hrefs and invalid hex colors are replaced with defaults.
 */
export function parseHeroContent(
  raw: Record<string, string>
): HeroContent {
  function get(key: string): string {
    return raw[key] || HERO_DEFAULTS[key] || "";
  }

  const ctaHref = get("hero.ctaHref");
  const cta2Href = get("hero.cta2Href");
  const bgColor = get("hero.bgColor");

  return {
    badge: get("hero.badge"),
    headline1: get("hero.headline1"),
    headline2: get("hero.headline2"),
    body: get("hero.body"),
    ctaLabel: get("hero.ctaLabel"),
    ctaHref: isSafeHref(ctaHref) ? ctaHref : HERO_DEFAULTS["hero.ctaHref"]!,
    ctaMicro: get("hero.ctaMicro"),
    cta2Label: get("hero.cta2Label"),
    cta2Href: isSafeHref(cta2Href) ? cta2Href : HERO_DEFAULTS["hero.cta2Href"]!,
    stat1Number: get("hero.stat1.number"),
    stat1Label: get("hero.stat1.label"),
    stat2Number: get("hero.stat2.number"),
    stat2Label: get("hero.stat2.label"),
    stat3Number: get("hero.stat3.number"),
    stat3Label: get("hero.stat3.label"),
    bgColor: isValidHex(bgColor) ? bgColor : HERO_DEFAULTS["hero.bgColor"]!,
  };
}

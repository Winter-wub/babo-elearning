// -----------------------------------------------------------------------
// Color conversion utilities — hex <-> OKLch (pure math, no dependencies)
// -----------------------------------------------------------------------

/**
 * Convert a hex color string to an OKLch CSS string.
 * @param hex - e.g. "#4f46e5" or "4f46e5"
 * @returns e.g. "oklch(0.488 0.243 264.376)"
 */
export function hexToOklch(hex: string): string {
  const { l, c, h } = hexToOklchValues(hex);
  // Omit hue when chroma is effectively zero (achromatic)
  if (c < 0.001) {
    return `oklch(${l.toFixed(3)} 0 0)`;
  }
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(3)})`;
}

/**
 * Convert hex to raw OKLch values { l, c, h }.
 */
export function hexToOklchValues(hex: string): {
  l: number;
  c: number;
  h: number;
} {
  const rgb = hexToSrgb(hex);
  const linear = srgbToLinear(rgb);
  const lab = linearRgbToOklab(linear);
  return oklabToOklch(lab);
}

/**
 * Derive a complete theme palette from a single primary hex color.
 * Returns CSS variable values (oklch strings) keyed by their CSS property names.
 *
 * Light-mode constraint: `--primary` must contrast against white background
 * (WCAG AA ≈ 4.5:1). In OKLch this means L ≤ ~0.55. If the user picks a
 * pastel/light color we darken it and boost chroma so it stays vivid.
 */
export function derivePalette(primaryHex: string): Record<string, string> {
  const { l, c, h } = hexToOklchValues(primaryHex);

  // Ensure primary has enough contrast against white (L=1) for text usage.
  // Cap lightness at 0.55; boost chroma slightly when darkening so the
  // color stays vibrant instead of turning muddy.
  const primaryL = Math.min(l, 0.55);
  const primaryC = l > 0.55 ? Math.min(c * 1.15, 0.35) : c;
  const primary = toOklchStr(primaryL, primaryC, h);

  // Primary foreground — white on the (possibly darkened) primary
  const primaryFg =
    primaryL < 0.6 ? "oklch(0.985 0 0)" : "oklch(0.205 0 0)";

  // Accent — slightly lighter, less saturated version (use original L for a
  // softer pastel feel on surfaces where contrast is not critical)
  const accentL = Math.min(l + 0.35, 0.965);
  const accentC = c * 0.15;
  const accent = toOklchStr(accentL, accentC, h);
  const accentFg = "oklch(0.205 0 0)";

  // Ring — medium lightness version of primary
  const ringL = Math.min(Math.max(primaryL + 0.15, 0.4), 0.75);
  const ringC = primaryC * 0.6;
  const ring = toOklchStr(ringL, ringC, h);

  // Sidebar primary — slightly brighter primary for contrast on dark sidebar
  const sidebarPrimaryL = Math.min(primaryL + 0.1, 0.85);
  const sidebarPrimaryC = Math.min(primaryC * 1.1, 0.35);
  const sidebarPrimary = toOklchStr(sidebarPrimaryL, sidebarPrimaryC, h);

  // Secondary — very light, low chroma
  const secondaryL = 0.965;
  const secondaryC = c * 0.05;
  const secondary = toOklchStr(secondaryL, secondaryC, h);
  const secondaryFg = "oklch(0.205 0 0)";

  return {
    "--primary": primary,
    "--primary-foreground": primaryFg,
    "--accent": accent,
    "--accent-foreground": accentFg,
    "--ring": ring,
    "--secondary": secondary,
    "--secondary-foreground": secondaryFg,
    "--sidebar-primary": sidebarPrimary,
    "--sidebar-primary-foreground": primaryFg,
  };
}

/**
 * Derive dark-mode palette overrides from a single primary hex color.
 *
 * Dark-mode constraint: `--primary` must contrast against the dark background
 * (L ≈ 0.145). In OKLch this means the primary's L should be ≥ ~0.65.
 */
export function deriveDarkPalette(primaryHex: string): Record<string, string> {
  const { l, c, h } = hexToOklchValues(primaryHex);

  // In dark mode, the primary is lighter — ensure L ≥ 0.65 for contrast
  const darkPrimaryL = Math.max(Math.min(l + 0.4, 0.92), 0.65);
  const darkPrimaryC = c * 0.85;
  const primary = toOklchStr(darkPrimaryL, darkPrimaryC, h);
  const primaryFg =
    darkPrimaryL > 0.5 ? "oklch(0.205 0 0)" : "oklch(0.985 0 0)";

  // Accent — dark surface with slight hue tint
  const accentL = 0.269;
  const accentC = c * 0.08;
  const accent = toOklchStr(accentL, accentC, h);

  // Ring — muted version
  const ringL = 0.439;
  const ringC = c * 0.4;
  const ring = toOklchStr(ringL, ringC, h);

  // Secondary — dark surface
  const secondaryL = 0.269;
  const secondaryC = c * 0.06;
  const secondary = toOklchStr(secondaryL, secondaryC, h);

  // Sidebar primary — vivid accent for dark sidebar, floor at 0.50 for contrast
  const sidebarPrimaryL = Math.max(Math.min(l + 0.15, 0.7), 0.50);
  const sidebarPrimaryC = Math.min(c * 1.2, 0.35);
  const sidebarPrimary = toOklchStr(sidebarPrimaryL, sidebarPrimaryC, h);

  return {
    "--primary": primary,
    "--primary-foreground": primaryFg,
    "--accent": accent,
    "--accent-foreground": "oklch(0.985 0 0)",
    "--ring": ring,
    "--secondary": secondary,
    "--secondary-foreground": "oklch(0.985 0 0)",
    "--sidebar-primary": sidebarPrimary,
    "--sidebar-primary-foreground": "oklch(0.985 0 0)",
  };
}

// -----------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------

function toOklchStr(l: number, c: number, h: number): string {
  if (c < 0.001) return `oklch(${l.toFixed(3)} 0 0)`;
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(3)})`;
}

/** Parse hex string to sRGB [0-1] channels. */
function hexToSrgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return [r, g, b];
}

/** sRGB gamma to linear. */
function srgbToLinear(rgb: [number, number, number]): [number, number, number] {
  return rgb.map((c) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  ) as [number, number, number];
}

/** Linear RGB to OKLab using the OKLab matrix. */
function linearRgbToOklab(
  rgb: [number, number, number]
): [number, number, number] {
  const [r, g, b] = rgb;

  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bVal = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  return [L, a, bVal];
}

/** OKLab to OKLch (polar form). */
function oklabToOklch(lab: [number, number, number]): {
  l: number;
  c: number;
  h: number;
} {
  const [L, a, b] = lab;
  const c = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

"use client";

import { derivePalette, deriveDarkPalette, hexToOklch } from "@/lib/color-utils";

interface ThemePreviewProps {
  primaryColor: string;
  sidebarBg: string;
  sidebarFg: string;
  radius: string;
  darkMode: boolean;
}

/**
 * Live preview mini-card that demonstrates how theme settings will look.
 * Uses inline `style` to scope CSS variables so it doesn't affect the rest of the page.
 */
export function ThemePreview({
  primaryColor,
  sidebarBg,
  sidebarFg,
  radius,
  darkMode,
}: ThemePreviewProps) {
  const palette = darkMode
    ? deriveDarkPalette(primaryColor)
    : derivePalette(primaryColor);
  const sidebarBgOklch = hexToOklch(sidebarBg);
  const sidebarFgOklch = hexToOklch(sidebarFg);

  const cssVars: Record<string, string> = {
    "--preview-primary": palette["--primary"],
    "--preview-primary-fg": palette["--primary-foreground"],
    "--preview-accent": palette["--accent"],
    "--preview-accent-fg": palette["--accent-foreground"],
    "--preview-ring": palette["--ring"],
    "--preview-secondary": palette["--secondary"],
    "--preview-secondary-fg": palette["--secondary-foreground"],
    "--preview-sidebar-bg": sidebarBgOklch,
    "--preview-sidebar-fg": sidebarFgOklch,
    "--preview-sidebar-primary": palette["--sidebar-primary"],
    "--preview-radius": `${radius}rem`,
    "--preview-bg": darkMode ? "oklch(0.145 0 0)" : "oklch(1 0 0)",
    "--preview-fg": darkMode ? "oklch(0.985 0 0)" : "oklch(0.145 0 0)",
    "--preview-card": darkMode ? "oklch(0.205 0 0)" : "oklch(1 0 0)",
    "--preview-border": darkMode ? "oklch(0.269 0 0)" : "oklch(0.922 0 0)",
    "--preview-muted": darkMode ? "oklch(0.269 0 0)" : "oklch(0.965 0 0)",
    "--preview-muted-fg": darkMode ? "oklch(0.708 0 0)" : "oklch(0.45 0 0)",
  };

  return (
    <div
      className="overflow-hidden rounded-xl border border-border"
      style={cssVars as React.CSSProperties}
    >
      {/* Label */}
      <div className="border-b border-border bg-muted/50 px-4 py-2">
        <p className="text-xs font-medium text-muted-foreground">
          ตัวอย่าง{darkMode ? " (โหมดมืด)" : " (โหมดสว่าง)"}
        </p>
      </div>

      {/* Preview layout */}
      <div className="flex h-64">
        {/* Mini sidebar */}
        <div
          className="flex w-16 shrink-0 flex-col items-center gap-3 py-4"
          style={{ background: "var(--preview-sidebar-bg)", color: "var(--preview-sidebar-fg)" }}
        >
          {/* Logo placeholder */}
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold"
            style={{ background: "var(--preview-sidebar-primary)", color: "var(--preview-primary-fg)" }}
          >
            E
          </div>
          {/* Nav items */}
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-2 w-8 rounded-sm opacity-40"
              style={{
                background: "var(--preview-sidebar-fg)",
                opacity: i === 1 ? 0.9 : 0.3,
              }}
            />
          ))}
        </div>

        {/* Main content area */}
        <div
          className="flex flex-1 flex-col gap-3 p-4"
          style={{ background: "var(--preview-bg)", color: "var(--preview-fg)" }}
        >
          {/* Header bar */}
          <div
            className="flex items-center justify-between rounded-md px-3 py-2"
            style={{
              background: "var(--preview-card)",
              border: "1px solid var(--preview-border)",
              borderRadius: "var(--preview-radius)",
            }}
          >
            <div
              className="h-2 w-20 rounded-sm"
              style={{ background: "var(--preview-muted)" }}
            />
            <div
              className="h-5 w-5 rounded-full"
              style={{ background: "var(--preview-primary)" }}
            />
          </div>

          {/* Card */}
          <div
            className="flex flex-col gap-2 p-3"
            style={{
              background: "var(--preview-card)",
              border: "1px solid var(--preview-border)",
              borderRadius: "var(--preview-radius)",
            }}
          >
            <div
              className="h-2 w-24 rounded-sm"
              style={{ background: "var(--preview-fg)", opacity: 0.7 }}
            />
            <div
              className="h-2 w-36 rounded-sm"
              style={{ background: "var(--preview-muted-fg)", opacity: 0.5 }}
            />

            {/* Buttons */}
            <div className="mt-1 flex gap-2">
              <button
                className="px-3 py-1 text-xs font-medium"
                style={{
                  background: "var(--preview-primary)",
                  color: "var(--preview-primary-fg)",
                  borderRadius: "var(--preview-radius)",
                }}
              >
                ปุ่มหลัก
              </button>
              <button
                className="px-3 py-1 text-xs font-medium"
                style={{
                  background: "var(--preview-secondary)",
                  color: "var(--preview-secondary-fg)",
                  borderRadius: "var(--preview-radius)",
                  border: "1px solid var(--preview-border)",
                }}
              >
                ปุ่มรอง
              </button>
            </div>
          </div>

          {/* Input mock */}
          <div
            className="h-8 px-3 flex items-center"
            style={{
              background: "var(--preview-card)",
              border: "1px solid var(--preview-border)",
              borderRadius: "var(--preview-radius)",
            }}
          >
            <span
              className="text-xs"
              style={{ color: "var(--preview-muted-fg)" }}
            >
              ค้นหา...
            </span>
          </div>

          {/* Badge row */}
          <div className="flex gap-2">
            <span
              className="inline-flex px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: "var(--preview-primary)",
                color: "var(--preview-primary-fg)",
                borderRadius: "calc(var(--preview-radius) * 2)",
              }}
            >
              แบดจ์
            </span>
            <span
              className="inline-flex px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: "var(--preview-accent)",
                color: "var(--preview-accent-fg)",
                borderRadius: "calc(var(--preview-radius) * 2)",
              }}
            >
              สำเร็จ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import type { ThemeSettings } from "@/actions/theme.actions";
import { derivePalette, deriveDarkPalette, hexToOklch } from "@/lib/color-utils";
import { THEME_DEFAULTS } from "@/lib/constants";

interface ThemeStyleProps {
  settings: ThemeSettings;
}

/**
 * Injects CSS custom property overrides into the page and manages the
 * dark-mode class on <html>. Server-rendered into initial HTML to
 * avoid any flash of unstyled content.
 */
export function ThemeStyle({ settings }: ThemeStyleProps) {
  const isCustomPrimary =
    settings.primaryColor !== THEME_DEFAULTS.primaryColor;
  const isCustomSidebar =
    settings.sidebarBg !== THEME_DEFAULTS.sidebarBg ||
    settings.sidebarFg !== THEME_DEFAULTS.sidebarFg;
  const isCustomRadius = settings.radius !== THEME_DEFAULTS.radius;

  // Toggle dark class on <html>
  useEffect(() => {
    const html = document.documentElement;
    if (settings.defaultMode === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [settings.defaultMode]);

  // Only inject overrides if something differs from defaults
  const hasOverrides = isCustomPrimary || isCustomSidebar || isCustomRadius;
  if (!hasOverrides) return null;

  // Build light-mode overrides
  const lightVars: string[] = [];
  const darkVars: string[] = [];

  if (isCustomPrimary) {
    const lightPalette = derivePalette(settings.primaryColor);
    for (const [prop, value] of Object.entries(lightPalette)) {
      lightVars.push(`  ${prop}: ${value};`);
    }

    const darkPalette = deriveDarkPalette(settings.primaryColor);
    for (const [prop, value] of Object.entries(darkPalette)) {
      darkVars.push(`  ${prop}: ${value};`);
    }
  }

  if (isCustomSidebar) {
    const sidebarBgOklch = hexToOklch(settings.sidebarBg);
    const sidebarFgOklch = hexToOklch(settings.sidebarFg);
    lightVars.push(`  --sidebar-background: ${sidebarBgOklch};`);
    lightVars.push(`  --sidebar-foreground: ${sidebarFgOklch};`);
    // Use same sidebar colors in dark mode
    darkVars.push(`  --sidebar-background: ${sidebarBgOklch};`);
    darkVars.push(`  --sidebar-foreground: ${sidebarFgOklch};`);
  }

  if (isCustomRadius) {
    lightVars.push(`  --radius: ${settings.radius}rem;`);
    darkVars.push(`  --radius: ${settings.radius}rem;`);
  }

  const css = [
    lightVars.length > 0 ? `:root {\n${lightVars.join("\n")}\n}` : "",
    darkVars.length > 0 ? `.dark {\n${darkVars.join("\n")}\n}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

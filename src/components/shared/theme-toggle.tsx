"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored) {
      setIsDark(stored === "dark");
    } else {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
    >
      <span className="relative flex h-4 w-4 items-center justify-center">
        <Sun
          className="absolute h-4 w-4 transition-all duration-200"
          style={{
            opacity: isDark ? 0 : 1,
            transform: isDark ? "rotate(90deg) scale(0.75)" : "rotate(0deg) scale(1)",
          }}
        />
        <Moon
          className="absolute h-4 w-4 transition-all duration-200"
          style={{
            opacity: isDark ? 1 : 0,
            transform: isDark ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.75)",
          }}
        />
      </span>
    </Button>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";

export function VersionCheck() {
  const initialBuildId = useRef<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/build-id");
        initialBuildId.current = await res.text();
      } catch {
        // ignore - offline or fetch failed
      }
    }

    init();

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/build-id");
        const current = await res.text();
        if (initialBuildId.current && current !== initialBuildId.current) {
          toast({
            title: "มีเวอร์ชันใหม่",
            description: "กดรีเฟรชเพื่ออัปเดตเวอร์ชันล่าสุด",
            action: (
              <button
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring"
                onClick={() => window.location.reload()}
              >
                รีเฟรช
              </button>
            ),
          });
          clearInterval(interval);
        }
      } catch {
        // ignore - offline or fetch failed
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
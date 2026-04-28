"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

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
              <ToastAction altText="รีเฟรช" onClick={() => window.location.reload()}>
                รีเฟรช
              </ToastAction>
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
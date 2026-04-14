"use client";

import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTourContext } from "@/components/providers/tour-provider";

export function HeaderHelpButton() {
  const { startTour, hasSteps } = useTourContext();

  if (!hasSteps) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={startTour}
      aria-label="วิธีการใช้งาน"
    >
      <CircleHelp className="h-4 w-4" />
      วิธีการใช้งาน
    </Button>
  );
}

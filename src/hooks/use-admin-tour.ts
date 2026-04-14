"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { TOUR_STEPS } from "@/lib/tour/tour-steps";
import {
  TOUR_SEEN_PREFIX,
  TOUR_DISMISSED_KEY,
  TOUR_AUTO_START_DELAY,
} from "@/lib/tour/constants";

interface UseAdminTourOptions {
  onRequestSidebarOpen?: () => void;
}

function getStepsForPath(pathname: string) {
  // Exact match first
  if (TOUR_STEPS[pathname]) return TOUR_STEPS[pathname];
  // Strip query-string–style suffixes for pages like /admin/videos?isActive=true
  const base = pathname.split("?")[0];
  return TOUR_STEPS[base] ?? null;
}

function hasSeenTour(pathname: string): boolean {
  try {
    return localStorage.getItem(TOUR_SEEN_PREFIX + pathname) === "true";
  } catch {
    return false;
  }
}

function markTourSeen(pathname: string) {
  try {
    localStorage.setItem(TOUR_SEEN_PREFIX + pathname, "true");
  } catch {
    // localStorage unavailable
  }
}

function isTourDismissed(): boolean {
  try {
    return localStorage.getItem(TOUR_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function dismissAllTours() {
  try {
    localStorage.setItem(TOUR_DISMISSED_KEY, "true");
  } catch {
    // localStorage unavailable
  }
}

export function useAdminTour(options?: UseAdminTourOptions) {
  const pathname = usePathname();
  const driverRef = useRef<Driver | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps = getStepsForPath(pathname);
  const hasSteps = steps !== null && steps.length > 0;

  const createDriver = useCallback(() => {
    return driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      stagePadding: 8,
      stageRadius: 8,
      popoverOffset: 16,
      overlayOpacity: 0.7,
      popoverClass: "admin-tour-popover",
      nextBtnText: "ถัดไป",
      prevBtnText: "ก่อนหน้า",
      doneBtnText: "เสร็จสิ้น",
      progressText: "{{current}} จาก {{total}}",
      onDestroyStarted: () => {
        // Mark this page's tour as seen when user completes or closes
        markTourSeen(pathname);
        driverRef.current?.destroy();
      },
    });
  }, [pathname]);

  const startTour = useCallback(() => {
    if (!steps || steps.length === 0) return;

    // If first step targets sidebar, ensure it's open on mobile
    const firstStep = steps[0];
    if (
      firstStep.element &&
      typeof firstStep.element === "string" &&
      firstStep.element.includes("sidebar")
    ) {
      options?.onRequestSidebarOpen?.();
    }

    // Destroy any existing tour
    if (driverRef.current) {
      driverRef.current.destroy();
    }

    const d = createDriver();
    driverRef.current = d;

    // Filter steps to only those whose elements exist in the DOM
    const availableSteps = steps.filter((step) => {
      if (!step.element || typeof step.element !== "string") return true;
      return document.querySelector(step.element) !== null;
    });

    if (availableSteps.length === 0) return;

    d.setSteps(availableSteps);
    d.drive();
  }, [steps, options, createDriver]);

  // Auto-start tour on first visit to this page
  useEffect(() => {
    if (!hasSteps || isTourDismissed() || hasSeenTour(pathname)) return;

    timerRef.current = setTimeout(() => {
      startTour();
    }, TOUR_AUTO_START_DELAY);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname, hasSteps, startTour]);

  // Cleanup driver on unmount or route change
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [pathname]);

  return { startTour, hasSteps, dismissAllTours };
}

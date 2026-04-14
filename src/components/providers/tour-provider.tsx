"use client";

import { createContext, useContext } from "react";
import { useAdminTour } from "@/hooks/use-admin-tour";

interface TourContextValue {
  startTour: () => void;
  hasSteps: boolean;
  dismissAllTours: () => void;
}

const TourContext = createContext<TourContextValue>({
  startTour: () => {},
  hasSteps: false,
  dismissAllTours: () => {},
});

export const useTourContext = () => useContext(TourContext);

interface TourProviderProps {
  children: React.ReactNode;
  onRequestSidebarOpen?: () => void;
}

export function TourProvider({
  children,
  onRequestSidebarOpen,
}: TourProviderProps) {
  const tour = useAdminTour({ onRequestSidebarOpen });

  return <TourContext.Provider value={tour}>{children}</TourContext.Provider>;
}

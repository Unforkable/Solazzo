"use client";

import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";

/** Initializes PostHog on first client render. No-op when env vars are missing. */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAnalytics();
  }, []);

  return <>{children}</>;
}

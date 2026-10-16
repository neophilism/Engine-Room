"use client";

import React, { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

export const PORTFOLIO_REFRESH_MS = 600_000;

export function PortfolioRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible" && !pending) startTransition(() => router.refresh());
    };
    // Manual is the default: no unattended periodic dashboard refresh.
    const timer = undefined as ReturnType<typeof setInterval> | undefined;
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener('engine-room-data-changed',refresh);
    return () => {
      if(timer)window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener('engine-room-data-changed',refresh);
    };
  }, [router, pending]);

  return <div className="portfolio-refresh">
    <span aria-live="polite">{pending ? "Updating the dashboard…" : "Manual refresh · click Refresh in the header to fetch GitHub"}</span>
  </div>;
}

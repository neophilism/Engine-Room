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
    const timer = window.setInterval(refresh, PORTFOLIO_REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener('engine-room-data-changed',refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener('engine-room-data-changed',refresh);
    };
  }, [router, pending]);

  return <div className="portfolio-refresh">
    <span aria-live="polite">{pending ? "Updating the dashboard…" : "Dashboard updates every 10 minutes · use Refresh in the header to fetch GitHub"}</span>
  </div>;
}

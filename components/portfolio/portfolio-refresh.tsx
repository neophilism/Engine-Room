"use client";

import React, { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

export const PORTFOLIO_REFRESH_MS = 30_000;

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
    <span aria-live="polite">{pending ? "Refreshing portfolio…" : "Updates on data changes · 30-second refresh fallback"}</span>
    <button type="button" className="portfolio-control-button" disabled={pending}
      onClick={() => startTransition(() => router.refresh())}>Refresh now</button>
  </div>;
}

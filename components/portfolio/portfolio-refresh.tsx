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
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, pending]);

  return <div className="portfolio-refresh">
    <span aria-live="polite">{pending ? "Refreshing portfolio…" : "Refreshes every 30 seconds while visible"}</span>
    <button type="button" className="portfolio-control-button" disabled={pending}
      onClick={() => startTransition(() => router.refresh())}>Refresh now</button>
  </div>;
}

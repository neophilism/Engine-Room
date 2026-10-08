"use client";
import React, { useEffect, useState } from "react";
import type { FiresideObservation } from "../../lib/server/public-platform-metrics";
import type { MarketplaceObservation } from "../../lib/server/public-marketplace-metrics";

export function PlatformMetrics() {
  const [observation, setObservation] = useState<FiresideObservation | null>(null);
  const [marketplace, setMarketplace] = useState<MarketplaceObservation | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/platform-metrics", { cache: "no-store" });
        if (!response.ok) return;
        const data: { fireside?: FiresideObservation; ram?: MarketplaceObservation } = await response.json();
        if (active && data.fireside) setObservation(data.fireside);
        if (active && data.ram) setMarketplace(data.ram);
      } catch {
        if (active) setObservation(null);
      }
    };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 5 * 60 * 1000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const metrics = observation?.source === "platform-api" ? observation.metrics : null;
  return <section className="panel" aria-label="Live platform metrics" style={{marginTop:"18px",marginBottom:"18px"}}>
    <div className="section-heading">
      <div><p className="eyebrow">Source-connected platform statistics</p>
        <h2>Fireside Chat archive</h2></div>
      <a href="https://fireside-chat-preview.onrender.com" target="_blank" rel="noopener noreferrer">Open platform ↗</a>
    </div>
    <div className="portfolio-stat-grid">
      <div className="portfolio-stat"><span>Voices of Congress</span><strong>{metrics ? metrics.showCount : "Unverified"}</strong></div>
      <div className="portfolio-stat"><span>Episodes</span><strong>{metrics ? metrics.episodeCount : "Unverified"}</strong></div>
      <div className="portfolio-stat"><span>Hours of source episodes</span><strong>{metrics ? metrics.totalHours : "Unverified"}</strong></div>
    </div>
    <p className="metric-freshness" aria-live="polite">
      {metrics && observation ? `From Fireside Chat API · checked ${observation.observedAt.slice(0,16).replace("T"," ")} UTC` : "Public archive feed not yet verified. No values are inferred."}
      {" "}Episode hours measure published content duration, not individual visitor listening time.
    </p>
    <div style={{marginTop:"18px",paddingTop:"14px",borderTop:"1px solid var(--er-border-metal)"}}>
      <div className="section-heading">
        <h3>RAM Marketplace public preview</h3>
        <a href="https://ram-marketplace-preview.onrender.com" target="_blank" rel="noopener noreferrer">Open marketplace ↗</a>
      </div>
      <p>Published anonymized preview listings: <strong>{marketplace?.source === "platform-api" ? marketplace.publicListings : "Unverified"}</strong></p>
      <p className="metric-freshness" aria-live="polite">
        {marketplace?.source === "platform-api" ? `From RAM Marketplace API · checked ${marketplace.observedAt.slice(0,16).replace("T"," ")} UTC` : "Public marketplace observation unavailable; no inventory count is inferred."}
        {" "}Preview records may include demonstration listings and do not establish available transaction inventory.
      </p>
    </div>
  </section>;
}

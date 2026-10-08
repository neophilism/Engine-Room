import React from "react";
import type { TelemetryFeed } from "../../lib/server/telemetry";
import { BrassPanel, IndicatorLamp } from "../machine";

export function TelemetryFeeds({ data, evaluatedAt }: { data: { source: "database" | "unconfigured" | "error"; feeds: TelemetryFeed[] }; evaluatedAt: string }) {
  return <BrassPanel title="Telemetry feeds" eyebrow="Last accepted delivery">
    {data.feeds.length === 0 ? <p>{data.source === "error" ? "Feed receipts are unavailable." : "No accepted telemetry deliveries have been recorded."}</p> : <ul className="telemetry-feed-list">{data.feeds.map((feed) => {
      const age = new Date(evaluatedAt).getTime() - new Date(feed.receivedAt).getTime(), fresh = age >= 0 && age <= 900_000;
      return <li key={`${feed.projectName}/${feed.environment}/${feed.source}`}><strong>{feed.projectName}</strong><span>{feed.environment} · {feed.source} · {feed.adapter}</span><IndicatorLamp label={fresh ? "Recent delivery" : "Stale delivery"} state={fresh ? "active" : "neutral"} /><time dateTime={feed.receivedAt}>{feed.receivedAt.replace("T", " ").slice(0, 19)} UTC</time><span>{feed.records} records in last delivery</span></li>;
    })}</ul>}
    <p className="portfolio-calculation-note">Recent delivery measures ingestion activity. Operational health depends on the observations and their timestamps.</p>
  </BrassPanel>;
}

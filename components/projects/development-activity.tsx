"use client";

import React, { useState } from "react";
import { activityKinds, safeGitHubActivityUrl, type ActivityKind, type DevelopmentActivity } from "../../lib/domain/development-activity";

export function DevelopmentActivityTimeline({ activities }: { activities: readonly DevelopmentActivity[] }) {
  const [kind, setKind] = useState<ActivityKind | "all">("all");
  const visible = activities.filter((activity) => kind === "all" || activity.kind === kind);
  return <div>
    <label className="activity-filter">Activity type<select value={kind} onChange={(event) => setKind(event.target.value as ActivityKind | "all")}>
      <option value="all">All activity</option>{activityKinds.map((value) => <option value={value} key={value}>{value.replaceAll("-", " ")}</option>)}
    </select></label>
    {visible.length === 0 ? <p>{activities.length === 0 ? "No development activity has been synchronized yet." : "No activity matches this type."}</p>
      : <ol className="development-activity-list">{visible.map((activity) => <li key={`${activity.repositoryFullName}:${activity.kind}:${activity.externalId}`}>
        <span className="activity-kind">{activity.kind.replaceAll("-", " ")}</span>
        <div><strong>{safeGitHubActivityUrl(activity.url) ? <a href={safeGitHubActivityUrl(activity.url)} target="_blank" rel="noopener noreferrer">{activity.title} ↗</a> : activity.title}</strong>
          <p>{activity.repositoryFullName}{activity.actor ? ` · ${activity.actor}` : ""}{activity.state ? ` · ${activity.state}` : ""}{activity.conclusion ? ` · ${activity.conclusion}` : ""}</p></div>
        <time dateTime={activity.occurredAt}>{activity.occurredAt.slice(0, 16).replace("T", " ")} UTC</time>
      </li>)}</ol>}
    <p className="portfolio-calculation-note">Recent synchronized activity. Commits, reviews, issues, and workflow runs do not independently advance roadmap completion.</p>
  </div>;
}

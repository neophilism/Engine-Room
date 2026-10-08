export const activityKinds = ["pull-request", "commit", "issue", "review", "workflow"] as const;
export type ActivityKind = typeof activityKinds[number];
export type DevelopmentActivity = { repositoryFullName: string; kind: ActivityKind; externalId: string; title: string; url: string; occurredAt: string; actor?: string; state?: string; conclusion?: string };

export function safeGitHubActivityUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "github.com" && !url.username && !url.password ? url.href : undefined; }
  catch { return undefined; }
}

/**
 * Read-only observation of the publicly exposed Fireside Chat archive health.
 * Deployment status alone does not establish archive-ingestion success.
 */
export type FiresideFeedHealth = {
  checkedAt: string;
  feeds: {
    active: number;
    healthy: number;
    failing: number;
    stale: number;
    neverSynced: number;
    lastSuccessfulRunAt: string | null;
  };
  archive: {
    episodes: number;
    transcriptsComplete: number;
    transcriptCoveragePercent: number;
  };
};

export type FiresideHealthObservation = {
  source: "platform-api" | "unverified";
  observedAt: string;
  health: FiresideFeedHealth | null;
};

const HEALTH_URL = "https://fireside-chat-preview.onrender.com/api/health/ready";
const CACHE_MS = 60 * 1000;
let cached: { until: number; read: Promise<FiresideHealthObservation> } | undefined;

function count(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function utc(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value));
}

export function validateFiresideFeedHealth(payload: unknown): FiresideFeedHealth | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const data = payload as Record<string, unknown>;
  if (data.ok !== true || data.service !== "fireside-chat" || data.database !== "reachable" || !utc(data.checkedAt)) return null;
  if (!data.feeds || typeof data.feeds !== "object" || Array.isArray(data.feeds)) return null;
  if (!data.archive || typeof data.archive !== "object" || Array.isArray(data.archive)) return null;
  const f = data.feeds as Record<string, unknown>;
  const a = data.archive as Record<string, unknown>;
  if (![f.active, f.healthy, f.failing, f.stale, f.neverSynced, a.episodes, a.transcriptsComplete, a.transcriptCoveragePercent].every(count)) return null;
  if (f.active !== (f.healthy as number) + (f.failing as number) + (f.stale as number) + (f.neverSynced as number)) return null;
  if ((a.transcriptsComplete as number) > (a.episodes as number) || (a.transcriptCoveragePercent as number) > 100) return null;
  if (f.lastSuccessfulRunAt !== null && !utc(f.lastSuccessfulRunAt)) return null;
  return {
    checkedAt: data.checkedAt,
    feeds: {
      active: f.active as number,
      healthy: f.healthy as number,
      failing: f.failing as number,
      stale: f.stale as number,
      neverSynced: f.neverSynced as number,
      lastSuccessfulRunAt: f.lastSuccessfulRunAt as string | null
    },
    archive: {
      episodes: a.episodes as number,
      transcriptsComplete: a.transcriptsComplete as number,
      transcriptCoveragePercent: a.transcriptCoveragePercent as number
    }
  };
}

export async function readFiresideFeedHealth(fetcher: typeof fetch = fetch): Promise<FiresideHealthObservation> {
  const observedAt = new Date().toISOString();
  try {
    const response = await fetcher(HEALTH_URL, {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(7000)
    });
    if (!response.ok) return { source: "unverified", observedAt, health: null };
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > 100_000) return { source: "unverified", observedAt, health: null };
    const health = validateFiresideFeedHealth(await response.json());
    return { source: health ? "platform-api" : "unverified", observedAt, health };
  } catch {
    return { source: "unverified", observedAt, health: null };
  }
}

export function loadFiresideFeedHealth(fetcher: typeof fetch = fetch, now = Date.now()): Promise<FiresideHealthObservation> {
  if (fetcher === fetch && cached && now < cached.until) return cached.read;
  const read = readFiresideFeedHealth(fetcher);
  if (fetcher === fetch) cached = { until: now + CACHE_MS, read };
  return read;
}

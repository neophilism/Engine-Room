export type FiresideArchiveMetrics = {
  showCount: number;
  episodeCount: number;
  totalHours: number;
};

export type FiresideObservation = {
  source: "platform-api" | "unverified";
  observedAt: string;
  metrics: FiresideArchiveMetrics | null;
};

const SOURCE_URL = "https://fireside-chat-preview.onrender.com/api/archive-stats";
const CACHE_MS = 5 * 60 * 1000;
let cache: { until: number; read: Promise<FiresideObservation> } | undefined;

function count(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function validateFiresideArchiveMetrics(value: unknown): FiresideArchiveMetrics | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Partial<FiresideArchiveMetrics>;
  if (!count(data.showCount) || !count(data.episodeCount) || !count(data.totalHours)) return null;
  return { showCount: data.showCount, episodeCount: data.episodeCount, totalHours: data.totalHours };
}

export async function readFiresideArchiveMetrics(
  fetcher: typeof fetch = fetch
): Promise<FiresideObservation> {
  const observedAt = new Date().toISOString();
  try {
    const response = await fetcher(SOURCE_URL, {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(7000)
    });
    if (!response.ok) return { source: "unverified", observedAt, metrics: null };
    const metrics = validateFiresideArchiveMetrics(await response.json());
    return { source: metrics ? "platform-api" : "unverified", observedAt, metrics };
  } catch {
    return { source: "unverified", observedAt, metrics: null };
  }
}

export function loadFiresideArchiveMetrics(fetcher: typeof fetch = fetch, now = Date.now()): Promise<FiresideObservation> {
  if (fetcher === fetch && cache && now < cache.until) return cache.read;
  const read = readFiresideArchiveMetrics(fetcher);
  if (fetcher === fetch) cache = { until: now + CACHE_MS, read };
  return read;
}

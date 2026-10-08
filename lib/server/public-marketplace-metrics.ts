export type MarketplaceObservation = {
  source: "platform-api" | "unverified";
  observedAt: string;
  publicListings: number | null;
};

const MARKETPLACE_URL = "https://ram-marketplace-preview.onrender.com/api/marketplace";
const CACHE_MS = 5 * 60 * 1000;
let cache: { until: number; read: Promise<MarketplaceObservation> } | undefined;

export function countAnonymizedMarketplaceListings(payload: unknown): number | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const data = payload as Record<string, unknown>;
  if (!Array.isArray(data.data) || data.data.length > 20000) return null;
  const privacy = data.privacy;
  if (!privacy || typeof privacy !== "object" || Array.isArray(privacy)) return null;
  const flags = privacy as Record<string, unknown>;
  if (flags.sourceIdentityIncluded !== false ||
      flags.exactLocationIncluded !== false ||
      flags.restrictedSourceJoinAllowed !== false) return null;
  return data.data.length;
}

export async function readMarketplaceMetrics(fetcher: typeof fetch = fetch): Promise<MarketplaceObservation> {
  const observedAt = new Date().toISOString();
  try {
    const response = await fetcher(MARKETPLACE_URL, {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(7000)
    });
    if (!response.ok) return { source:"unverified", observedAt, publicListings:null };
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > 2_000_000) return { source:"unverified", observedAt, publicListings:null };
    const publicListings = countAnonymizedMarketplaceListings(await response.json());
    return { source:publicListings===null ? "unverified" : "platform-api", observedAt, publicListings };
  } catch {
    return { source:"unverified", observedAt, publicListings:null };
  }
}

export function loadMarketplaceMetrics(fetcher: typeof fetch = fetch, now = Date.now()): Promise<MarketplaceObservation> {
  if (fetcher === fetch && cache && now < cache.until) return cache.read;
  const read = readMarketplaceMetrics(fetcher);
  if (fetcher === fetch) cache = { until: now + CACHE_MS, read };
  return read;
}

import { verifiedRenderServices, type PublicSiteObservation } from "../domain/render-deployments";

type Fetcher = typeof fetch;
const CHECK_CACHE_MS = 10 * 60 * 1000;
const CHECK_TIMEOUT_MS = 7000;
let cache: { expires: number; value: Promise<PublicSiteObservation[]> } | null = null;

export function publicSiteUrl(website: string) {
  const url = new URL(website);
  if (url.protocol !== "https:" || !/^[a-z0-9-]+\.onrender\.com$/.test(url.hostname) ||
      url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Public site is outside the approved Render hostname allowlist.");
  }
  return url;
}

export async function probePublicSite(
  service: { id: string; website: string },
  fetcher: Fetcher = fetch
): Promise<PublicSiteObservation> {
  const checkedAt = new Date().toISOString();
  try {
    const url = publicSiteUrl(service.website);
    let response = await fetcher(url, {
      method: "HEAD",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS)
    });
    if (response.status === 405) {
      await response.body?.cancel();
      response = await fetcher(url, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS)
      });
    }
    const httpStatus = response.status;
    await response.body?.cancel();
    return { serviceId: service.id, httpStatus, checkedAt, observation: "http-response" };
  } catch {
    return { serviceId: service.id, httpStatus: null, checkedAt, observation: "no-response" };
  }
}

export function loadPublicSiteObservations(
  fetcher: Fetcher = fetch,
  at = Date.now()
): Promise<PublicSiteObservation[]> {
  // Unit tests can provide their own transport without sharing production cache.
  if (fetcher === fetch && cache && at < cache.expires) return cache.value;
  const value = Promise.all(verifiedRenderServices.map(service => probePublicSite(service, fetcher)));
  if (fetcher === fetch) cache = { expires: at + CHECK_CACHE_MS, value };
  return value;
}

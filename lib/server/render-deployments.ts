import { asLatestRenderDeployment, verifiedRenderServices, type RenderReadout } from "../domain/render-deployments";

type HttpFetch = typeof fetch;

/** Optional provider-backed live reads. An absent/failed credential leaves clearly dated verified records. */
export async function loadRenderDeployments(
  apiKey: string | undefined = process.env.RENDER_API_KEY,
  fetcher: HttpFetch = fetch
): Promise<RenderReadout[]> {
  if (!apiKey?.trim()) {
    return verifiedRenderServices.map(service => ({ ...service, source: "verified-snapshot" }));
  }
  return Promise.all(verifiedRenderServices.map(async (service): Promise<RenderReadout> => {
    try {
      const response = await fetcher("https://api.render.com/v1/services/" + encodeURIComponent(service.id) + "/deploys?limit=1", {
        headers: { Accept: "application/json", Authorization: "Bearer " + apiKey.trim() },
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(12000)
      });
      if (!response.ok) throw new Error("Render API read unavailable");
      const deployment = asLatestRenderDeployment(await response.json());
      if (!deployment) throw new Error("Render API returned an unknown deployment");
      return {
        ...service,
        deployStatus: deployment.status,
        deployedCommit: deployment.commitSha,
        lastObservedAt: deployment.updatedAt,
        source: "render-api",
        checkedAt: new Date().toISOString()
      };
    } catch {
      return { ...service, source: "verified-snapshot" };
    }
  }));
}

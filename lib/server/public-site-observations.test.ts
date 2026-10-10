import { verifiedRenderServices } from "../domain/render-deployments";
import { describe, expect, it, vi } from "vitest";
import { publicSiteUrl, probePublicSite, loadPublicSiteObservations } from "./public-site-observations";
describe("Public platform HTTP observations", () => {
  const service = { id: "one", website: "https://engine-room-1ec7.onrender.com" };
  it("restricts outbound destinations to explicit Render HTTPS hosts", () => {
    expect(publicSiteUrl(service.website).hostname).toBe("engine-room-1ec7.onrender.com");
    expect(() => publicSiteUrl("http://engine-room-1ec7.onrender.com")).toThrow();
    expect(() => publicSiteUrl("https://127.0.0.1")).toThrow();
    expect(() => publicSiteUrl("https://evil.onrender.com.attacker.test")).toThrow();
    expect(() => publicSiteUrl("https://engine-room-1ec7.onrender.com/other")).toThrow();
  });
  it("probes the FOIA SQLite health endpoint while retaining the hostname allowlist", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 200 })) as unknown as typeof fetch;
    const result = await probePublicSite({
      id: "foia", website: "https://foia-aggregator.onrender.com", healthPath: "/healthz"
    }, fetcher);
    expect(result.httpStatus).toBe(200);
    expect(String(vi.mocked(fetcher).mock.calls[0][0])).toBe("https://foia-aggregator.onrender.com/healthz");
  });
  it("probes the real Algorithmic Accountability health route on its allowlisted host", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 200 })) as unknown as typeof fetch;
    const result = await probePublicSite({
      id: "algorithmic-accountability",
      website: "https://algorithmic-accountability-preview.onrender.com",
      healthPath: "/api/engine-health",
    }, fetcher);
    expect(result).toMatchObject({
      serviceId: "algorithmic-accountability",
      httpStatus: 200,
      observation: "http-response",
    });
    expect(String(vi.mocked(fetcher).mock.calls[0][0]))
      .toBe("https://algorithmic-accountability-preview.onrender.com/api/engine-health");
  });
  it("checks Stems database readiness instead of treating the homepage as health", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: false, service: "stems-white-label", dependencies: { database: "unavailable" }
      }), { status: 503 })) as unknown as typeof fetch;
    const result = await probePublicSite({
      id: "stems",
      website: "https://stems-white-label-preview.onrender.com",
      healthPath: "/api/ready"
    }, fetcher);
    expect(result).toMatchObject({ serviceId: "stems", httpStatus: 503, observation: "http-response" });
    expect(vi.mocked(fetcher)).toHaveBeenCalledTimes(2);
    expect(String(vi.mocked(fetcher).mock.calls[1][0])).toBe(
      "https://stems-white-label-preview.onrender.com/api/ready"
    );
  });
  it("reports real HTTP status without declaring application health", async () => {
    const fetcher=vi.fn(async()=>new Response(null,{status:503})) as unknown as typeof fetch;
    const result=await probePublicSite(service,fetcher);
    expect(result).toMatchObject({serviceId:"one",httpStatus:503,observation:"http-response"});
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("treats network failures as unknown rather than asserting a website is down", async () => {
    const fetcher=vi.fn(async()=>{throw new Error("Network unavailable");}) as unknown as typeof fetch;
    const result=await probePublicSite(service,fetcher);
    expect(result).toMatchObject({serviceId:"one",httpStatus:null,observation:"no-response"});
  });
  it("falls back to GET when HEAD is unsupported", async () => {
    const fetcher=vi.fn()
      .mockResolvedValueOnce(new Response(null,{status:405}))
      .mockResolvedValueOnce(new Response("Welcome",{status:200})) as unknown as typeof fetch;
    const result=await probePublicSite(service,fetcher);
    expect(result.httpStatus).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("reports one independent observation for every known platform", async () => {
    const fetcher=vi.fn(async()=>new Response(null,{status:204})) as unknown as typeof fetch;
    const checks=await loadPublicSiteObservations(fetcher);
    expect(checks).toHaveLength(verifiedRenderServices.length);
    expect(checks.every(row=>row.observation==="http-response" && row.httpStatus===204)).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(verifiedRenderServices.length);
  });
});

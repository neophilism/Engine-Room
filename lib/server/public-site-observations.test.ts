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
    expect(checks).toHaveLength(13);
    expect(checks.every(row=>row.observation==="http-response" && row.httpStatus===204)).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(13);
  });
});

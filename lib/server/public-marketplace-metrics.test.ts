import { describe, expect, it, vi } from "vitest";
import { countAnonymizedMarketplaceListings, readMarketplaceMetrics } from "./public-marketplace-metrics";
const privacy={sourceIdentityIncluded:false,exactLocationIncluded:false,restrictedSourceJoinAllowed:false};
describe("RAM public marketplace count", () => {
  it("counts only rows from an explicit privacy-safe public projection", () => {
    expect(countAnonymizedMarketplaceListings({data:[{id:1},{id:2}],privacy})).toBe(2);
    expect(countAnonymizedMarketplaceListings({data:[],privacy})).toBe(0);
    expect(countAnonymizedMarketplaceListings({data:[{}],privacy:{...privacy,sourceIdentityIncluded:true}})).toBeNull();
    expect(countAnonymizedMarketplaceListings({data:[{}]})).toBeNull();
    expect(countAnonymizedMarketplaceListings({data:"broken",privacy})).toBeNull();
  });
  it("reads a fixed public API and does not preserve listing identity data", async () => {
    const fetcher=vi.fn(async()=>new Response(JSON.stringify({data:[{id:"public1"},{id:"public2"}],privacy}),{status:200})) as unknown as typeof fetch;
    const result=await readMarketplaceMetrics(fetcher);
    expect(result).toMatchObject({source:"platform-api",publicListings:2});
    expect(JSON.stringify(result)).not.toContain("public1");
    expect(fetcher).toHaveBeenCalledWith("https://ram-marketplace-preview.onrender.com/api/marketplace",expect.objectContaining({method:"GET"}));
  });
  it("treats protected or missing source as unverified rather than zero", async () => {
    const fetcher=vi.fn(async()=>new Response(null,{status:503})) as unknown as typeof fetch;
    expect(await readMarketplaceMetrics(fetcher)).toMatchObject({source:"unverified",publicListings:null});
  });
});

import { describe, expect, it, vi } from "vitest";
import { validateFiresideArchiveMetrics, readFiresideArchiveMetrics } from "./public-platform-metrics";

describe("public Fireside Chat metrics adapter", () => {
  it("accepts only finite integer archive counts", () => {
    expect(validateFiresideArchiveMetrics({showCount:4,episodeCount:92,totalHours:17})).toEqual({showCount:4,episodeCount:92,totalHours:17});
    expect(validateFiresideArchiveMetrics({showCount:0,episodeCount:0,totalHours:0})).not.toBeNull();
    expect(validateFiresideArchiveMetrics({showCount:-1,episodeCount:2,totalHours:1})).toBeNull();
    expect(validateFiresideArchiveMetrics({showCount:4,episodeCount:"92",totalHours:17})).toBeNull();
    expect(validateFiresideArchiveMetrics({showCount:4,episodeCount:92,totalHours:Infinity})).toBeNull();
  });
  it("reads the actual public endpoint schema without inventing data", async () => {
    const fetcher=vi.fn(async()=>new Response(JSON.stringify({showCount:20,episodeCount:71,totalHours:37}),{status:200,headers:{"Content-Type":"application/json"}})) as unknown as typeof fetch;
    const result=await readFiresideArchiveMetrics(fetcher);
    expect(result).toMatchObject({source:"platform-api",metrics:{showCount:20,episodeCount:71,totalHours:37}});
    expect(fetcher).toHaveBeenCalledWith("https://fireside-chat-preview.onrender.com/api/archive-stats",expect.objectContaining({method:"GET"}));
  });
  it("does not represent source failures as zero", async () => {
    const forbidden=vi.fn(async()=>new Response("Forbidden",{status:403})) as unknown as typeof fetch;
    const record=await readFiresideArchiveMetrics(forbidden);
    expect(record).toMatchObject({source:"unverified",metrics:null});
    const broken=vi.fn(async()=>{throw new Error("network");}) as unknown as typeof fetch;
    expect(await readFiresideArchiveMetrics(broken)).toMatchObject({source:"unverified",metrics:null});
  });
});

import { verifiedRenderServices } from "../domain/render-deployments";
import { describe, expect, it, vi } from "vitest";
import { loadRenderDeployments } from "./render-deployments";
describe("Render dashboard adapter", () => {
  it("uses dated source records without guessing live health when unconfigured", async () => {
    const data = await loadRenderDeployments(undefined);
    expect(data).toHaveLength(verifiedRenderServices.length);
    expect(data.every(service=>service.source==="verified-snapshot")).toBe(true);
  });
  it("updates from real provider responses when configured, falls back if source rejects", async () => {
    const requester=vi.fn(async()=>new Response(JSON.stringify([{deploy:{status:"live",updatedAt:"2026-10-08T09:00:00Z",commit:{id:"b".repeat(40)}}}]),{status:200}));
    const rows=await loadRenderDeployments("test-secret",requester as typeof fetch);
    expect(requester).toHaveBeenCalledTimes(verifiedRenderServices.length);
    expect(rows[0]).toMatchObject({source:"render-api",lastObservedAt:"2026-10-08T09:00:00Z"});
    const failing=await loadRenderDeployments("test-secret",vi.fn(async()=>new Response("unavailable",{status:503})) as typeof fetch);
    expect(failing.every(service=>service.source==="verified-snapshot")).toBe(true);
  });
});

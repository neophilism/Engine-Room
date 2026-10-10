import { describe, expect, it, vi } from "vitest";
import { validateFiresideFeedHealth, readFiresideFeedHealth } from "./public-fireside-health";

const healthy = {
  ok: true,
  service: "fireside-chat",
  database: "reachable",
  checkedAt: "2026-10-09T20:00:00.000Z",
  feeds: {
    active: 37, healthy: 33, failing: 4, stale: 0, neverSynced: 0,
    lastSuccessfulRunAt: "2026-10-09T19:59:00.000Z",
    staleAfterHours: 36
  },
  archive: {
    episodes: 5932, transcriptsComplete: 296, transcriptCoveragePercent: 5
  }
};

describe("Fireside Chat public feed health", () => {
  it("accepts source-backed degraded states without hiding failing feeds", () => {
    expect(validateFiresideFeedHealth(healthy)).toMatchObject({
      feeds: { active: 37, failing: 4 }, archive: { episodes: 5932 }
    });
  });

  it("rejects impossible feed totals and false database readiness", () => {
    expect(validateFiresideFeedHealth({ ...healthy, database: "unreachable" })).toBeNull();
    expect(validateFiresideFeedHealth({ ...healthy, feeds: { ...healthy.feeds, active: 45 } })).toBeNull();
    expect(validateFiresideFeedHealth({ ...healthy, archive: { episodes: 10, transcriptsComplete: 100, transcriptCoveragePercent: 100 } })).toBeNull();
  });

  it("never converts failed responses into a healthy observation", async () => {
    const unavailable = vi.fn(async () => new Response(null, { status: 503 })) as unknown as typeof fetch;
    expect(await readFiresideFeedHealth(unavailable)).toMatchObject({ source: "unverified", health: null });
    const valid = vi.fn(async () => Response.json(healthy)) as unknown as typeof fetch;
    expect(await readFiresideFeedHealth(valid)).toMatchObject({ source: "platform-api", health: { feeds: { failing: 4 } } });
  });

  it("rejects redirects instead of following an untrusted health URL", async () => {
    const redirect = vi.fn(async () => new Response(null, { status: 302, headers: { Location: "https://example.com" } })) as unknown as typeof fetch;
    expect(await readFiresideFeedHealth(redirect)).toMatchObject({ source: "unverified" });
    expect(redirect).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it, beforeEach, vi } from "vitest";
import { getDatabasePool } from "../../../lib/server/database";
import { GET } from "./route";

vi.mock("../../../lib/server/database", () => ({ getDatabasePool: vi.fn() }));
const query = vi.fn();

describe("production readiness for live monitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDatabasePool).mockReturnValue({ query } as unknown as ReturnType<typeof getDatabasePool>);
  });

  it("requires migration 0017 and the durable monitoring tables", async () => {
    query.mockResolvedValue({ rows: [{ ready: true }] });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ready", schemaVersion: "0017" });
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain("version = '0017'");
    for (const table of ["github_repository_sync", "github_check_runs", "engine_room_live_state", "project_plan_documents", "project_plan_items"]) {
      expect(sql).toContain("public." + table);
    }
  });

  it("fails closed when required migrations are absent", async () => {
    query.mockResolvedValue({ rows: [{ ready: false }] });
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });

  it("fails closed if the database query fails or is empty", async () => {
    query.mockRejectedValueOnce(new Error("database unavailable"));
    expect((await GET()).status).toBe(503);
    query.mockResolvedValueOnce({ rows: [] });
    expect((await GET()).status).toBe(503);
  });
});

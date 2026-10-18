import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { handleIdlePoolErrors } from "./database-pool-errors.mjs";

describe("idle database connection failure recovery", () => {
  it("keeps idle error events from escaping and preserves the pool for later requests", () => {
    const pool = new EventEmitter();
    const report = vi.fn();
    expect(handleIdlePoolErrors(pool, report)).toBe(pool);
    const failure = Object.assign(new Error("sensitive connection details"), { code: "57P01", client: { password: "secret" } });
    expect(() => pool.emit("error", failure)).not.toThrow();
    expect(() => pool.emit("error", failure)).not.toThrow();
    expect(report).toHaveBeenCalledTimes(2);
    expect(report).toHaveBeenCalledWith(expect.any(String), { code: "57P01" });
    expect(JSON.stringify(report.mock.calls)).not.toMatch(/sensitive|password|secret/);
  });

  it("logs only a bounded non-sensitive fallback for arbitrary connection errors", () => {
    const pool = new EventEmitter();
    const report = vi.fn();
    handleIdlePoolErrors(pool, report);
    pool.emit("error", { code: "postgres://user:password@host/database" });
    expect(report).toHaveBeenCalledWith(expect.any(String), { code: "UNAVAILABLE" });
  });
});

import { describe, expect, it } from "vitest";
import { getRuntimeConfig, requireDatabaseUrl } from "./env";

describe("runtime configuration", () => {
  it("provides safe local defaults", () => {
    expect(getRuntimeConfig({})).toEqual({
      nodeEnv: "development",
      databaseUrl: undefined,
      appBaseUrl: "http://localhost:3000",
      logLevel: "info"
    });
  });

  it("normalizes configured values", () => {
    const config = getRuntimeConfig({
      NODE_ENV: "production",
      DATABASE_URL: " postgresql://example.invalid/engine_room ",
      ENGINE_ROOM_BASE_URL: " https://engine-room.example ",
      LOG_LEVEL: "warn"
    });

    expect(config.nodeEnv).toBe("production");
    expect(config.databaseUrl).toBe("postgresql://example.invalid/engine_room");
    expect(config.appBaseUrl).toBe("https://engine-room.example");
    expect(config.logLevel).toBe("warn");
  });

  it("fails clearly when a database operation has no URL", () => {
    expect(() => requireDatabaseUrl({})).toThrow("DATABASE_URL is required");
  });
});

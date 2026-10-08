import { describe, expect, it } from "vitest";
import { getRuntimeConfig, requireDatabaseUrl, requireGitHubAppConfig } from "./env";

describe("runtime configuration", () => {
  it("provides safe local defaults", () => {
    expect(getRuntimeConfig({})).toEqual({
      nodeEnv: "development",
      databaseUrl: undefined,
      appBaseUrl: "http://localhost:3000",
      logLevel: "info",
      github: {
        appId: undefined,
        privateKey: undefined,
        webhookSecret: undefined,
        apiBaseUrl: "https://api.github.com"
      }
    });
  });

  it("normalizes configured values", () => {
    const config = getRuntimeConfig({
      NODE_ENV: "production",
      DATABASE_URL: " postgresql://example.invalid/engine_room ",
      ENGINE_ROOM_BASE_URL: " https://engine-room.example ",
      LOG_LEVEL: "warn",
      GITHUB_APP_ID: " 12345 ",
      GITHUB_APP_PRIVATE_KEY: " line-one\\nline-two ",
      GITHUB_WEBHOOK_SECRET: " webhook-secret ",
      GITHUB_API_BASE_URL: " https://github.example/api/v3 "
    });

    expect(config.nodeEnv).toBe("production");
    expect(config.databaseUrl).toBe("postgresql://example.invalid/engine_room");
    expect(config.appBaseUrl).toBe("https://engine-room.example");
    expect(config.logLevel).toBe("warn");
    expect(config.github).toEqual({
      appId: "12345",
      privateKey: "line-one\nline-two",
      webhookSecret: "webhook-secret",
      apiBaseUrl: "https://github.example/api/v3"
    });
  });

  it("fails clearly when a database operation has no URL", () => {
    expect(() => requireDatabaseUrl({})).toThrow("DATABASE_URL is required");
  });

  it("fails clearly when GitHub App credentials are incomplete", () => {
    expect(() => requireGitHubAppConfig({ GITHUB_APP_ID: "123" })).toThrow(
      "GITHUB_APP_PRIVATE_KEY"
    );
  });
});

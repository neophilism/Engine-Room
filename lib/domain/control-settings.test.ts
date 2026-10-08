import { describe, expect, it } from "vitest";
import { parseControlSettings, parseControlUpdate, parseInstallationId } from "./control-settings";
import { authorizeAdmin, trustedWriteOrigin } from "../server/admin-auth";

describe("control-plane policy validation", () => {
  it("accepts an explicit supported policy revision", () => {
    expect(parseControlUpdate({expectedRevision:0,settings:{githubReconciliationEnabled:true,githubReconciliationIntervalMinutes:60}}))
      .toMatchObject({expectedRevision:0,settings:{githubReconciliationEnabled:true}});
  });
  it("rejects implicit booleans, unsafe intervals, extra keys, invalid revisions", () => {
    expect(() => parseControlSettings({githubReconciliationEnabled:"true",githubReconciliationIntervalMinutes:60})).toThrow();
    expect(() => parseControlSettings({githubReconciliationEnabled:false,githubReconciliationIntervalMinutes:1})).toThrow();
    expect(() => parseControlSettings({githubReconciliationEnabled:false,githubReconciliationIntervalMinutes:60,secret:"leak"})).toThrow();
    expect(() => parseControlUpdate({expectedRevision:-1,settings:{githubReconciliationEnabled:false,githubReconciliationIntervalMinutes:60}})).toThrow();
  });
  it("validates canonical GitHub installation IDs", () => {
    expect(parseInstallationId("23")).toBe(23);
    expect(parseInstallationId("00023")).toBeNull();
    expect(parseInstallationId("9999999999999999999")).toBeNull();
  });
});

describe("administrator authorization", () => {
  const secret = "a-secure-example-token-that-is-more-than-thirty-two-chars";
  it("rejects missing/incorrect token and permits exact match", () => {
    expect(authorizeAdmin(new Headers(), {})).toBe("unconfigured");
    expect(authorizeAdmin(new Headers(), { ENGINE_ROOM_ADMIN_TOKEN: secret })).toBe("unauthorized");
    expect(authorizeAdmin(new Headers({Authorization:"Bearer wrong"}), { ENGINE_ROOM_ADMIN_TOKEN: secret })).toBe("unauthorized");
    expect(authorizeAdmin(new Headers({Authorization:`Bearer ${secret}`}), { ENGINE_ROOM_ADMIN_TOKEN: secret })).toBe("authorized");
  });
  it("rejects untrusted browser origins", () => {
    const req = new Request("https://engine.example/api/admin/settings", {headers:{Origin:"https://malicious.example"}});
    expect(trustedWriteOrigin(req, {ENGINE_ROOM_BASE_URL:"https://engine.example"})).toBe(false);
    expect(trustedWriteOrigin(req, {ENGINE_ROOM_BASE_URL:"https://malicious.example"})).toBe(true);
  });
});

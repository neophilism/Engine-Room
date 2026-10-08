import { expect, it } from "vitest";
import { accessFreshness, summarizeAccess, validateAccessObservation, type AccessPrincipal } from "./access";

const record: AccessPrincipal = { projectId: "p", projectName: "Core", projectSlug: "core", environment: "production", source: "identity", externalId: "obs-1", principalId: "user-1", displayName: "Operator", principalKind: "person", status: "active", roles: ["admin"], privileged: true, mfaEnabled: null, lastActiveAt: null, credentialExpiresAt: null, observedAt: new Date().toISOString() };
it("keeps unknown MFA and stale observations distinct from compliance", () => {
  expect(summarizeAccess([record], new Date())).toMatchObject({ active: 1, privileged: 1, mfaDisabled: 0, mfaUnknown: 1 });
  expect(accessFreshness({ ...record, observedAt: "2020-01-01T00:00:00Z" }, new Date())).toBe("stale");
  expect(accessFreshness(record, new Date("2000-01-01T00:00:00Z"))).toBe("unknown");
});
it("validates privileged roles and complete organization identities", () => {
  expect(() => validateAccessObservation(record)).not.toThrow();
  expect(() => validateAccessObservation({ ...record, privileged: false })).toThrow("privileged");
  expect(() => validateAccessObservation({ ...record, organizationId: "org" })).toThrow("Organization");
  expect(() => validateAccessObservation({ ...record, roles: ["admin", "admin"] })).toThrow();
});

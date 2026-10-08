import { expect, it } from "vitest";
import { buildAccessAnalytics } from "./access-analytics";
import type { AccessPrincipal } from "./access";
const now = new Date();
const record: AccessPrincipal = { projectId: "p1", projectName: "Core", projectSlug: "core", environment: "production", source: "tenant-a", externalId: "obs", principalId: "user", displayName: "Shared Name", principalKind: "person", status: "active", roles: ["admin"], privileged: true, mfaEnabled: false, lastActiveAt: null, organizationId: "org", organizationName: "Shared Org", credentialExpiresAt: null, observedAt: now.toISOString() };
it("joins provider identities across projects without merging names or other source authorities", () => {
  const data = buildAccessAnalytics([record, { ...record, projectId: "p2" }, { ...record, source: "tenant-b" }, { ...record, environment: "staging", source: "tenant-c" }], "production", now);
  expect(data.uniqueIdentities).toBe(2); expect(data.activeGrants).toBe(3); expect(data.organizations).toHaveLength(2);
  expect(data.identities.find((identity) => identity.source === "tenant-a")?.projects).toBe(2);
});
it("treats stale posture as unknown and flags current disabled MFA, credential expiry and broad grants", () => {
  const data = buildAccessAnalytics([record, { ...record, projectId: "p2" }, { ...record, projectId: "p3" }, { ...record, projectId: "stale", observedAt: "2020-01-01T00:00:00Z" },
    { ...record, principalId: "service", principalKind: "service", roles: ["operator"], credentialExpiresAt: "2020-01-01T00:00:00Z" }], "production", now);
  expect(data.findings.filter((finding) => finding.title === "Privileged identity has MFA disabled")).toHaveLength(3);
  expect(data.findings.some((finding) => finding.title.includes("expired"))).toBe(true);
  expect(data.findings.some((finding) => finding.title === "Broad privileged access")).toBe(true);
  expect(data.findings.filter((finding) => finding.projectName === "Core" && finding.title.includes("stale"))).toHaveLength(1);
});

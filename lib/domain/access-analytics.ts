import { accessFreshness, type AccessPrincipal } from "./access";

export type AccessFinding = { id: string; projectName: string; principalName: string; severity: "high" | "medium" | "info"; title: string; action: string };
export function buildAccessAnalytics(records: readonly AccessPrincipal[], environment: string, now: Date) {
  const scoped = records.filter((record) => record.environment === environment), active = scoped.filter((record) => record.status === "active");
  const identities = new Map<string, { source: string; name: string; principalKind: string; projects: Set<string>; privilegedProjects: Set<string> }>();
  const organizations = new Map<string, { source: string; name: string; principals: Set<string>; projects: Set<string> }>();
  const roles = new Map<string, { source: string; role: string; grants: number }>();
  const findings: AccessFinding[] = [];
  for (const record of scoped) {
    const id = `${record.projectId}/${record.source}/${record.principalId}`;
    const add = (kind: string, severity: AccessFinding["severity"], title: string, action: string) => findings.push({ id: id + "/" + kind, projectName: record.projectName, principalName: record.displayName, severity, title, action });
    if (accessFreshness(record, now) !== "fresh") { add("freshness", "info", "Access observation is stale or unknown", "Refresh the authoritative identity feed before assessing current access."); continue; }
    if (record.status !== "active") continue;
    if (record.principalKind === "person" && record.privileged && record.mfaEnabled !== true) add("mfa", record.mfaEnabled === false ? "high" : "medium", record.mfaEnabled === false ? "Privileged identity has MFA disabled" : "Privileged MFA posture is unknown", "Review MFA at the identity provider.");
    if (record.privileged && record.lastActiveAt && now.getTime() - new Date(record.lastActiveAt).getTime() > 90 * 86_400_000) add("dormant", "medium", "Privileged grant has no recent activity", "Review whether this grant is still required.");
    if (record.principalKind === "service" && record.credentialExpiresAt && new Date(record.credentialExpiresAt) <= now) add("expired", "high", "Service credential is expired", "Verify credential rotation and revoke obsolete credentials at the source.");
    else if (record.principalKind === "service" && record.privileged && record.credentialExpiresAt === null) add("expiry-unknown", "medium", "Privileged service credential expiry is unknown", "Record credential ownership and expiry at the source.");
  }
  for (const record of active) {
    const identityKey = record.source + "/" + record.principalId;
    const identity = identities.get(identityKey) ?? { source: record.source, name: record.displayName, principalKind: record.principalKind, projects: new Set<string>(), privilegedProjects: new Set<string>() };
    identity.projects.add(record.projectId); if (record.privileged && accessFreshness(record, now) === "fresh") identity.privilegedProjects.add(record.projectId); identities.set(identityKey, identity);
    if (record.organizationId) {
      const key = record.source + "/" + record.organizationId, organization = organizations.get(key) ?? { source: record.source, name: record.organizationName!, principals: new Set<string>(), projects: new Set<string>() };
      organization.principals.add(identityKey); organization.projects.add(record.projectId); organizations.set(key, organization);
    }
    for (const role of record.roles) {
      const key = record.source + "/" + role, group = roles.get(key) ?? { source: record.source, role, grants: 0 }; group.grants++; roles.set(key, group);
    }
  }
  for (const [id, identity] of identities) if (identity.privilegedProjects.size >= 3) findings.push({ id: id + "/breadth", projectName: `${identity.privilegedProjects.size} projects`, principalName: identity.name, severity: "medium", title: "Broad privileged access", action: "Review privileged grants across projects with their owners." });
  return { observedProjects: new Set(scoped.map((record) => record.projectId)).size, activeGrants: active.length, uniqueIdentities: identities.size,
    identities: [...identities.entries()].map(([id, group]) => ({ id, source: group.source, name: group.name, principalKind: group.principalKind, projects: group.projects.size, privilegedProjects: group.privilegedProjects.size })),
    organizations: [...organizations.entries()].map(([id, group]) => ({ id, source: group.source, name: group.name, principals: group.principals.size, projects: group.projects.size })),
    roles: [...roles.values()].sort((a,b) => b.grants - a.grants || a.source.localeCompare(b.source) || a.role.localeCompare(b.role)),
    findings: findings.sort((a,b) => ({ high: 0, medium: 1, info: 2 }[a.severity] - { high: 0, medium: 1, info: 2 }[b.severity]) || a.id.localeCompare(b.id)) };
}

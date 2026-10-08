export const principalStatuses = ["active", "invited", "suspended", "deleted"] as const;
export type PrincipalStatus = typeof principalStatuses[number];
export type AccessObservation = {
  projectId: string; environment: string; source: string; externalId: string; principalId: string; displayName: string; principalKind: "person" | "service"; status: PrincipalStatus;
  roles: string[]; privileged: boolean; mfaEnabled: boolean | null; lastActiveAt: string | null; organizationId?: string; organizationName?: string; credentialExpiresAt: string | null; observedAt: string;
};
export type AccessPrincipal = AccessObservation & { projectName: string; projectSlug: string };
export type AccessOverview = { source: "database" | "unconfigured" | "error"; principals: AccessPrincipal[] };
export function validateAccessObservation(record: AccessObservation) {
  const identity = /^[A-Za-z0-9._:@-]{1,200}$/;
  if (!record.projectId || !/^[a-z0-9-]{1,64}$/.test(record.environment) || !/^[A-Za-z0-9._-]{1,128}$/.test(record.source) || !identity.test(record.externalId) || !identity.test(record.principalId)
    || !record.displayName.trim() || record.displayName.length > 200 || !["person", "service"].includes(record.principalKind) || !principalStatuses.includes(record.status)
    || !Array.isArray(record.roles) || record.roles.length > 64 || new Set(record.roles).size !== record.roles.length || record.roles.some((role) => !/^[a-z0-9._-]{1,64}$/.test(role))
    || typeof record.privileged !== "boolean" || (record.mfaEnabled !== null && typeof record.mfaEnabled !== "boolean")) throw new Error("Invalid access identity, status, or roles.");
  if (record.roles.some((role) => role === "admin" || role === "owner") && !record.privileged) throw new Error("Admin and owner roles must declare privileged access.");
  if ((record.organizationId === undefined) !== (record.organizationName === undefined) || (record.organizationId !== undefined && (!identity.test(record.organizationId) || !record.organizationName?.trim() || record.organizationName.length > 200))) throw new Error("Organization identity and name must be supplied together.");
  const observed = new Date(record.observedAt).getTime();
  if (!Number.isFinite(observed) || observed > Date.now() + 300_000 || (record.lastActiveAt !== null && (!Number.isFinite(new Date(record.lastActiveAt).getTime()) || new Date(record.lastActiveAt).getTime() > observed)) || (record.credentialExpiresAt !== null && !Number.isFinite(new Date(record.credentialExpiresAt).getTime()))) throw new Error("Invalid access timestamps.");
}
export function accessFreshness(record: AccessObservation, now: Date) {
  const age = now.getTime() - new Date(record.observedAt).getTime();
  return !Number.isFinite(age) || age < 0 ? "unknown" : age > 86_400_000 ? "stale" : "fresh";
}
export function summarizeAccess(records: readonly AccessPrincipal[], now: Date) {
  const active = records.filter((record) => record.status === "active"), people = active.filter((record) => record.principalKind === "person");
  return { active: active.length, services: active.filter((record) => record.principalKind === "service").length, privileged: active.filter((record) => record.privileged).length,
    mfaDisabled: people.filter((record) => record.mfaEnabled === false).length, mfaUnknown: people.filter((record) => record.mfaEnabled === null).length,
    stale: records.filter((record) => accessFreshness(record, now) !== "fresh").length };
}

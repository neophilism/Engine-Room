/**
 * Relationships between reusable engines / standards and their downstream
 * implementations. Explicit repository identities prevent accidental grouping
 * based on similar names. Extend only for documented parent/child projects.
 */
export const IMPLEMENTATION_PARENTS: Readonly<Record<string, string>> = {
  "algorithmic-accountability": "compliance-authorization-immutable-audit-engine",
  "federal-encryption-compliance": "compliance-authorization-immutable-audit-engine",
  "smart-cities-surveillance-registry": "civic-registry-transparency-engine",
  "mms": "live-competition-engine",
  "rap-battle-platform": "live-competition-engine",
  "national-secure-ideas-submission": "secure-intake-case-workflow-engine",
  "end-to-end-everywhere-suite": "end-to-end-everywhere-security-architecture-standard"
  ,"scenesignal":"distributed-audio-engine"
  ,"distributed-radio-engine":"distributed-audio-engine"
  ,"trackzero":"distributed-radio-engine"
  ,"unsealed-records-command-center":"music-operations-engine"
};

export type ProjectHierarchyIdentity = {
  slug?: string;
  repositoryFullName?: string;
  displayName: string;
};

export function hierarchyProjectKey(project: ProjectHierarchyIdentity): string {
  const repository = project.repositoryFullName?.split("/").pop();
  return (repository ?? project.slug ?? project.displayName)
    .trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function parentEngineKey(project: ProjectHierarchyIdentity): string | undefined {
  return IMPLEMENTATION_PARENTS[hierarchyProjectKey(project)];
}

const compareByName = <T extends ProjectHierarchyIdentity>(a: T, b: T) =>
  a.displayName.localeCompare(b.displayName) ||
  hierarchyProjectKey(a).localeCompare(hierarchyProjectKey(b));

/**
 * Keep implementations directly beneath the visible engine (also when a sort
 * mode is active). A parent absent due to search/stage filtering does not
 * create invisible whitespace or force additional filtered results.
 */
export function orderProjectsByHierarchy<T extends ProjectHierarchyIdentity>(
  projects: readonly T[],
  compare: (a: T, b: T) => number = compareByName
): T[] {
  const byKey = new Map(projects.map((project) => [hierarchyProjectKey(project), project]));
  const roots: T[] = [];
  const children = new Map<string, T[]>();
  for (const project of projects) {
    const parent = parentEngineKey(project);
    const key = hierarchyProjectKey(project);
    if (parent && parent !== key && byKey.has(parent)) {
      const group = children.get(parent) ?? [];
      group.push(project);
      children.set(parent, group);
    } else {
      roots.push(project);
    }
  }
  const ordered: T[] = [];
  const seen = new Set<T>();
  const visit = (project: T) => {
    if (seen.has(project)) return;
    seen.add(project);
    ordered.push(project);
    const group = children.get(hierarchyProjectKey(project)) ?? [];
    group.sort(compare).forEach(visit);
  };
  roots.sort(compare).forEach(visit);
  // Safety for future mappings containing an accidental cycle.
  [...projects].sort(compare).forEach(visit);
  return ordered;
}

/** The number of visible ancestors; use it ONLY in the project name cell. */
export function projectNameIndent(
  project: ProjectHierarchyIdentity,
  visible: readonly ProjectHierarchyIdentity[]
): number {
  const keys = new Set(visible.map(hierarchyProjectKey));
  let key = hierarchyProjectKey(project);
  let depth = 0;
  const encountered = new Set([key]);
  while (IMPLEMENTATION_PARENTS[key] && keys.has(IMPLEMENTATION_PARENTS[key])) {
    const parent = IMPLEMENTATION_PARENTS[key];
    if (encountered.has(parent)) break;
    encountered.add(parent);
    depth++;
    key = parent;
  }
  return depth;
}

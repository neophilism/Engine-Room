export type FeatureStatus = "implemented" | "underway" | "remaining";
export type ProjectFeature = {
  id: string; projectId: string; key: string; title: string; description?: string;
  planned: number; merged: number; open: number; status: FeatureStatus;
};
export type FeatureDefinition = { key: string; title: string; description?: string; plannedPrOrdinals: number[] };

export function featureStatus(planned: number, merged: number, open: number): FeatureStatus {
  if (planned > 0 && merged === planned) return "implemented";
  if (merged > 0 || open > 0) return "underway";
  return "remaining";
}

export function validateFeatureDefinitions(definitions: readonly FeatureDefinition[]) {
  const keys = new Set<string>();
  for (const feature of definitions) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(feature.key) || feature.key.length > 64 || keys.has(feature.key)) throw new Error("Feature keys must be unique, valid slugs of at most 64 characters.");
    keys.add(feature.key);
    if (!feature.title.trim() || feature.title.length > 240 || (feature.description?.length ?? 0) > 2000) throw new Error("Feature titles and descriptions exceed the allowed limits.");
    if (feature.plannedPrOrdinals.some((ordinal) => !Number.isInteger(ordinal) || ordinal < 1) || new Set(feature.plannedPrOrdinals).size !== feature.plannedPrOrdinals.length) throw new Error("Feature roadmap ordinals must be unique positive integers.");
  }
}

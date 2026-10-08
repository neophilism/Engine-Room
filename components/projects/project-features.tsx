import React from "react";
import type { ProjectFeature } from "../../lib/domain/project-features";

const groups = [{ status: "implemented", label: "Implemented" }, { status: "underway", label: "Underway" }, { status: "remaining", label: "Remaining" }] as const;

export function ProjectFeatures({ features }: { features: readonly ProjectFeature[] }) {
  if (features.length === 0) return <p>No structured feature records have been registered for this project yet.</p>;
  return <div className="project-feature-groups">{groups.map((group) => {
    const selected = features.filter((feature) => feature.status === group.status);
    return <section key={group.status} aria-label={`${group.label} features`}>
      <h3>{group.label} <span>{selected.length}</span></h3>
      {selected.length > 0 ? <ul>{selected.map((feature) => <li key={feature.id}><strong>{feature.title}</strong>{feature.description && <p>{feature.description}</p>}
        <small>{feature.planned > 0 ? `${feature.merged}/${feature.planned} linked roadmap PRs merged` : "Roadmap links pending"}</small></li>)}</ul> : <p>No features in this stage.</p>}
    </section>;
  })}</div>;
}

import { createHash } from "node:crypto";
import type { ProjectManifest } from "../manifest/project-manifest";

export type ApprovedPlanVersion = {
  version: number;
  fingerprint: string;
  approvedAt: string;
};

export function fingerprintApprovedManifest(manifest: ProjectManifest) {
  const canonical = JSON.stringify({
    project: manifest.project,
    roadmap: manifest.roadmap,
    milestones: manifest.milestones
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function nextApprovedPlanVersion(
  existing: readonly ApprovedPlanVersion[],
  manifest: ProjectManifest
): { version: number; fingerprint: string; unchanged: boolean } {
  if (!manifest.roadmap.approved) {
    throw new Error("Only approved manifests can create approved plan versions.");
  }

  const fingerprint = fingerprintApprovedManifest(manifest);
  const latest = [...existing].sort((a, b) => b.version - a.version)[0];

  if (latest?.fingerprint === fingerprint) {
    return { version: latest.version, fingerprint, unchanged: true };
  }

  return {
    version: Math.max(0, ...existing.map((version) => version.version)) + 1,
    fingerprint,
    unchanged: false
  };
}

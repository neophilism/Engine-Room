import { createHash } from "node:crypto";

function section(yaml, name) {
  const parts = yaml.split(/\r?\n/);
  const index = parts.findIndex(line => line === name + ":");
  if (index === -1) throw new Error("Missing manifest section: " + name);
  const body = [];
  for (let next=index+1; next<parts.length; next++) {
    if (/^[a-z_]+:/.test(parts[next])) break;
    body.push(parts[next]);
  }
  return body;
}

function scalar(lines, key) {
  const line = lines.find(line => line.startsWith("  " + key + ": "));
  if (!line) throw new Error("Missing manifest scalar: " + key);
  return line.slice(("  " + key + ": ").length).trim();
}

/** Parse only the strictly defined, source-controlled Engine Room manifest format. */
export function parseApprovedManifest(yaml) {
  if (typeof yaml !== "string" || yaml.length > 64000) throw new Error("Invalid manifest.");
  const project = section(yaml, "project");
  const roadmap = section(yaml, "roadmap");
  const milestoneLines = section(yaml, "milestones");
  const milestones = [];
  for (let i=0;i<milestoneLines.length;i++) {
    if (milestoneLines[i].startsWith("  - name: ")) {
      const name = milestoneLines[i].slice("  - name: ".length).trim();
      const countLine = milestoneLines[++i] ?? "";
      if (!/^    prs: [0-9]+$/.test(countLine)) throw new Error("Invalid approved milestone.");
      milestones.push({name, prs:Number(countLine.slice("    prs: ".length))});
    } else if (milestoneLines[i].trim()) {
      throw new Error("Unexpected milestone field.");
    }
  }
  const result = {
    project: {
      name:scalar(project,"name"),
      displayName:scalar(project,"display_name"),
      repository:scalar(project,"repository"),
      status:scalar(project,"status")
    },
    roadmap: {
      version:Number(scalar(roadmap,"version")),
      plannedPrs:Number(scalar(roadmap,"planned_prs")),
      approved:scalar(roadmap,"approved") === "true"
    },
    milestones
  };
  if (result.project.repository!=="neophilism/Engine-Room" || !result.roadmap.approved ||
    result.roadmap.plannedPrs!==40 || result.roadmap.version!==1 ||
    milestones.length!==8 || milestones.reduce((sum,m)=>sum+m.prs,0)!==40) {
    throw new Error("Unexpected approved Engine Room roadmap.");
  }
  return result;
}

export function parseApprovedPlanTitles(markdown) {
  if (typeof markdown !== "string") throw new Error("Invalid development plan.");
  const found = [...markdown.matchAll(/^(\d+)\. ([^\r\n]+)$/gm)];
  const titles = new Map(found.map(entry=>[Number(entry[1]),entry[2].trim()]));
  if (found.length!==40 || titles.size!==40 || Array.from(titles.keys()).some((value,i)=>value!==i+1)) {
    throw new Error("Development plan does not define 40 sequential numbered units.");
  }
  return titles;
}

export function validateMapping(mapping, manifest) {
  if (!mapping || mapping.sourceRepository!==manifest.project.repository ||
    mapping.roadmapVersion!==manifest.roadmap.version ||
    !Array.isArray(mapping.pullRequestNumbers) ||
    mapping.pullRequestNumbers.length!==manifest.roadmap.plannedPrs ||
    new Set(mapping.pullRequestNumbers).size!==manifest.roadmap.plannedPrs ||
    mapping.pullRequestNumbers.some(n=>!Number.isSafeInteger(n)||n<1)) {
    throw new Error("Roadmap mapping must be a unique explicit list matching the approved plan.");
  }
  return mapping.pullRequestNumbers;
}

export function manifestFingerprint(manifest) {
  return createHash("sha256").update(JSON.stringify({
    project:manifest.project,roadmap:manifest.roadmap,milestones:manifest.milestones
  }),"utf8").digest("hex");
}

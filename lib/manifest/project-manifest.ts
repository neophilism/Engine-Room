export type ProjectManifest = {
  project: {
    name: string;
    displayName: string;
    repository: string;
    status: string;
  };
  roadmap: {
    version: number;
    plannedPrs: number;
    approved: boolean;
  };
  milestones: Array<{
    name: string;
    prs: number;
  }>;
};

type Scalar = string | number | boolean;
type Mapping = Record<string, Scalar>;

function parseScalar(raw: string): Scalar {
  const value = raw.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseKeyValue(line: string) {
  const separator = line.indexOf(":");
  if (separator < 1) throw new Error(`Invalid manifest line: ${line}`);
  const key = line.slice(0, separator).trim();
  const rawValue = line.slice(separator + 1);
  if (!rawValue.trim()) return { key, value: undefined };
  return { key, value: parseScalar(rawValue) };
}

function requiredString(map: Mapping, key: string, section: string) {
  const value = map[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${section}.${key} must be a non-empty string.`);
  }
  return value;
}

function requiredPositiveInteger(map: Mapping, key: string, section: string) {
  const value = map[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${section}.${key} must be a positive integer.`);
  }
  return value;
}

export function parseProjectManifest(source: string): ProjectManifest {
  const lines = source
    .split(/\r?\n/)
    .map((raw) => ({
      raw,
      indent: raw.match(/^\s*/)?.[0].length ?? 0,
      text: raw.trim()
    }))
    .filter((line) => line.text && !line.text.startsWith("#"));

  const project: Mapping = {};
  const roadmap: Mapping = {};
  const milestones: Mapping[] = [];
  let section: "project" | "roadmap" | "milestones" | undefined;
  let currentMilestone: Mapping | undefined;

  for (const line of lines) {
    if (line.indent === 0) {
      const { key, value } = parseKeyValue(line.text);
      if (value !== undefined || !["project", "roadmap", "milestones"].includes(key)) {
        throw new Error(`Unsupported top-level manifest key: ${key}`);
      }
      section = key as typeof section;
      currentMilestone = undefined;
      continue;
    }

    if (!section) throw new Error("Manifest content appears before a top-level section.");

    if (section === "milestones") {
      if (line.indent === 2 && line.text.startsWith("- ")) {
        currentMilestone = {};
        milestones.push(currentMilestone);
        const rest = line.text.slice(2).trim();
        if (rest) {
          const { key, value } = parseKeyValue(rest);
          if (value === undefined) throw new Error("Milestone list entries require scalar values.");
          currentMilestone[key] = value;
        }
        continue;
      }

      if (line.indent === 4 && currentMilestone) {
        const { key, value } = parseKeyValue(line.text);
        if (value === undefined) throw new Error("Milestone fields require scalar values.");
        currentMilestone[key] = value;
        continue;
      }

      throw new Error(`Invalid milestone indentation: ${line.raw}`);
    }

    if (line.indent !== 2) {
      throw new Error(`Invalid ${section} indentation: ${line.raw}`);
    }

    const { key, value } = parseKeyValue(line.text);
    if (value === undefined) throw new Error(`${section} fields require scalar values.`);
    (section === "project" ? project : roadmap)[key] = value;
  }

  const manifest: ProjectManifest = {
    project: {
      name: requiredString(project, "name", "project"),
      displayName: requiredString(project, "display_name", "project"),
      repository: requiredString(project, "repository", "project"),
      status: requiredString(project, "status", "project")
    },
    roadmap: {
      version: requiredPositiveInteger(roadmap, "version", "roadmap"),
      plannedPrs: requiredPositiveInteger(roadmap, "planned_prs", "roadmap"),
      approved:
        typeof roadmap.approved === "boolean"
          ? roadmap.approved
          : (() => {
              throw new Error("roadmap.approved must be a boolean.");
            })()
    },
    milestones: milestones.map((milestone, index) => ({
      name: requiredString(milestone, "name", `milestones[${index}]`),
      prs: requiredPositiveInteger(milestone, "prs", `milestones[${index}]`)
    }))
  };

  if (!/^[^/]+\/[^/]+$/.test(manifest.project.repository)) {
    throw new Error("project.repository must use owner/repository format.");
  }

  const milestoneTotal = manifest.milestones.reduce((sum, milestone) => sum + milestone.prs, 0);
  if (milestoneTotal !== manifest.roadmap.plannedPrs) {
    throw new Error(
      `Milestone PR total ${milestoneTotal} does not match roadmap.planned_prs ${manifest.roadmap.plannedPrs}.`
    );
  }

  return manifest;
}

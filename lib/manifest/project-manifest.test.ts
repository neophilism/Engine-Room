import { describe, expect, it } from "vitest";
import { parseProjectManifest } from "./project-manifest";

const manifest = `
project:
  name: Engine-Room
  display_name: Engine Room
  repository: neophilism/Engine-Room
  status: active-development

roadmap:
  version: 1
  planned_prs: 3
  approved: true

milestones:
  - name: Foundation
    prs: 1
  - name: GitHub engine
    prs: 2
`;

describe("project manifest parser", () => {
  it("parses the controlled .exechub manifest schema", () => {
    expect(parseProjectManifest(manifest)).toEqual({
      project: {
        name: "Engine-Room",
        displayName: "Engine Room",
        repository: "neophilism/Engine-Room",
        status: "active-development"
      },
      roadmap: {
        version: 1,
        plannedPrs: 3,
        approved: true
      },
      milestones: [
        { name: "Foundation", prs: 1 },
        { name: "GitHub engine", prs: 2 }
      ]
    });
  });

  it("rejects milestone totals that disagree with the approved denominator", () => {
    expect(() => parseProjectManifest(manifest.replace("planned_prs: 3", "planned_prs: 4"))).toThrow(
      "does not match roadmap.planned_prs"
    );
  });

  it("rejects malformed repository coordinates", () => {
    expect(() =>
      parseProjectManifest(manifest.replace("neophilism/Engine-Room", "Engine-Room"))
    ).toThrow("owner/repository format");
  });

  it("requires an explicit boolean approval flag", () => {
    expect(() => parseProjectManifest(manifest.replace("approved: true", "approved: yes"))).toThrow(
      "roadmap.approved must be a boolean"
    );
  });

  it("ignores blank lines and comments but rejects unknown top-level keys", () => {
    expect(parseProjectManifest("# comment\n" + manifest).roadmap.version).toBe(1);
    expect(() => parseProjectManifest(manifest + "\nunknown:\n  value: 1\n")).toThrow(
      "Unsupported top-level manifest key"
    );
  });
});

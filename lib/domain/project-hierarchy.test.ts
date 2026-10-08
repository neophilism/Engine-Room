import { describe, expect, it } from "vitest";
import { orderProjectsByHierarchy, parentEngineKey, projectNameIndent } from "./project-hierarchy";

const project = (repo: string, progress = 0) => ({
  displayName: repo.replaceAll("-", " "), repositoryFullName: "neophilism/" + repo,
  slug: repo.toLowerCase(), progress
});
const parent = project("Compliance-Authorization-Immutable-Audit-Engine", 5);
const algo = project("Algorithmic-Accountability", 100);
const encryption = project("Federal-Encryption-Compliance", 35);
const civic = project("Civic-Registry-Transparency-Engine");
const registry = project("Smart-Cities-Surveillance-Registry");
const live = project("Live-Competition-Engine");
const mms = project("MMS");
const battle = project("Rap-Battle-Platform");
const intake = project("Secure-Intake-Case-Workflow-Engine");
const secure = project("National-Secure-Ideas-Submission");
const standard = project("End-To-End-Everywhere-Security-Architecture-Standard");
const suite = project("End-To-End-Everywhere-Suite");

describe("engine implementation hierarchy", () => {
  it("places each documented implementation immediately under the engine", () => {
    const shuffled = [algo,registry,secure,mms,encryption,battle,suite,civic,intake,parent,standard,live];
    const result = orderProjectsByHierarchy(shuffled);
    for (const [engine, implementations] of [
      [parent, [algo, encryption]],
      [civic, [registry]],
      [live, [mms, battle]],
      [intake, [secure]],
      [standard, [suite]]
    ] as const) {
      const index = result.indexOf(engine);
      expect(result.slice(index + 1, index + 1 + implementations.length)).toEqual(implementations);
    }
    expect(shuffled[0]).toBe(algo);
    expect(projectNameIndent(algo, result)).toBe(1);
    expect(projectNameIndent(parent, result)).toBe(0);
    expect(parentEngineKey(encryption)).toBe("compliance-authorization-immutable-audit-engine");
  });
  it("keeps children under their engine even for numerical sort modes", () => {
    const sorted = orderProjectsByHierarchy([algo,parent,encryption,project("Unrelated",20)],(a,b)=>b.progress-a.progress);
    expect(sorted.slice(sorted.indexOf(parent) + 1, sorted.indexOf(parent) + 3)).toEqual([algo,encryption]);
  });
  it("does not indent a filtered implementation when its parent is hidden", () => {
    const filtered = orderProjectsByHierarchy([registry,algo]);
    expect(projectNameIndent(registry,filtered)).toBe(0);
    expect(projectNameIndent(algo,filtered)).toBe(0);
  });
  it("preserves every project without inventing parent links for unrelated projects", () => {
    const unrelated=project("Music_Video_Wizard");
    const arr=orderProjectsByHierarchy([unrelated,algo,algo]);
    expect(arr).toHaveLength(3);
    expect(parentEngineKey(unrelated)).toBeUndefined();
  });
});

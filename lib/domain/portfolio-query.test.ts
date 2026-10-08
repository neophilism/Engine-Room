import { describe, expect, it } from "vitest";
import type { PortfolioProjectOverview } from "./portfolio-overview";
import { defaultPortfolioQuery, githubRepositoryUrl, queryPortfolio } from "./portfolio-query";

const projects: PortfolioProjectOverview[] = [
  { id: "a", displayName: "Atlas", summary: "A civic registry", status: "live", completed: 2, inProgress: 0, planned: 2, percent: 100, repositories: [] },
  { id: "engine", displayName: "Engine Room", repositoryFullName: "neophilism/Engine-Room", status: "active-development", completed: 22, inProgress: 3, planned: 40, percent: 55, repositories: [] },
  { id: "b", displayName: "Beta", status: "planned", completed: 0, inProgress: 0, planned: 5, percent: 0, repositories: [{ id: "r", fullName: "owner/core", htmlUrl: "https://github.com/owner/core", completed: 0, inProgress: 0, planned: 5, percent: 0 }] }
];

describe("portfolio queries", () => {
  it("pins Engine Room in portfolio order without mutating the source", () => {
    expect(queryPortfolio(projects, defaultPortfolioQuery).map((p) => p.id)).toEqual(["engine", "a", "b"]);
    expect(projects[0].id).toBe("a");
  });
  it("combines case-insensitive search terms with lifecycle filters", () => {
    expect(queryPortfolio(projects, { ...defaultPortfolioQuery, search: "CIVIC registry", status: "live" }).map((p) => p.id)).toEqual(["a"]);
    expect(queryPortfolio(projects, { ...defaultPortfolioQuery, search: "owner/core" }).map((p) => p.id)).toEqual(["b"]);
    expect(queryPortfolio(projects, { ...defaultPortfolioQuery, search: "Atlas", status: "planned" })).toEqual([]);
  });
  it("sorts numeric progress and underway work", () => {
    expect(queryPortfolio(projects, { ...defaultPortfolioQuery, sort: "completion-desc" }).map((p) => p.id)).toEqual(["a", "engine", "b"]);
    expect(queryPortfolio(projects, { ...defaultPortfolioQuery, sort: "completion-asc" }).map((p) => p.id)).toEqual(["b", "engine", "a"]);
    expect(queryPortfolio(projects, { ...defaultPortfolioQuery, sort: "underway" })[0].id).toBe("engine");
  });
  it("keeps children under the engine in name and numeric sort orders", () => {
    const parent = { ...projects[0], id: "parent", slug: "civic-registry-transparency-engine", displayName: "Civic Registry Transparency Engine", planned: 10, completed: 1, percent: 10 };
    const child = { ...projects[1], id: "child", slug: "smart-cities-surveillance-registry", displayName: "Smart Cities Surveillance Registry", repositoryFullName: "neophilism/Smart-Cities-Surveillance-Registry", planned: 10, completed: 9, percent: 90 };
    const mixed = [child, projects[2], parent];
    expect(queryPortfolio(mixed, defaultPortfolioQuery).map(p => p.id)).toEqual(["b", "parent", "child"]);
    expect(queryPortfolio(mixed, { ...defaultPortfolioQuery, sort: "completion-desc" }).map(p => p.id)).toEqual(["parent", "child", "b"]);
    expect(queryPortfolio(mixed, { ...defaultPortfolioQuery, search: "Surveillance" }).map(p => p.id)).toEqual(["child"]);
  });
  it("only builds GitHub links from valid repository coordinates", () => {
    expect(githubRepositoryUrl("neophilism/Engine-Room")).toBe("https://github.com/neophilism/Engine-Room");
    for (const value of [undefined, "javascript:alert(1)", "https://evil.test/path", "owner/repo?redirect=x", "../x/y"]) expect(githubRepositoryUrl(value)).toBeUndefined();
  });
});

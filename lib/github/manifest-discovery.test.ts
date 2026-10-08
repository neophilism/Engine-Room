import { describe, expect, it, vi } from "vitest";
import { discoverApprovedManifest } from "./manifest-discovery";
import type { DiscoveredRepository } from "./types";
const repo: DiscoveredRepository = { githubRepositoryId: 42, ownerLogin: "example", name: "Platform", fullName:"example/Platform",htmlUrl:"https://github.com/example/Platform",defaultBranch:"main",visibility:"public",archived:false };
const config = { appId: "1", privateKey: "unused", apiBaseUrl: "https://api.github.com" };
const manifest = `project:
  name: Platform
  display_name: Platform
  repository: example/Platform
  status: live
roadmap:
  version: 1
  planned_prs: 2
  approved: true
milestones:
  - name: Setup
    prs: 2
`;
describe("approved manifest discovery", () => {
  it("decodes only repository-matching approved manifests", async () => {
    const fetcher=vi.fn(async()=>new Response(JSON.stringify({type:"file",encoding:"base64",content:Buffer.from(manifest).toString("base64")}),{status:200}));
    const result=await discoverApprovedManifest(config,repo,"access",fetcher);
    expect(result?.roadmap.plannedPrs).toBe(2);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("returns null for missing manifests and rejects mismatches", async () => {
    expect(await discoverApprovedManifest(config,repo,"access",async()=>new Response("Not found",{status:404}))).toBeNull();
    const mismatch=manifest.replace("repository: example/Platform","repository: example/Other");
    await expect(discoverApprovedManifest(config,repo,"access",async()=>new Response(JSON.stringify({type:"file",encoding:"base64",content:Buffer.from(mismatch).toString("base64")}),{status:200}))).rejects.toThrow("mismatch");
  });
});

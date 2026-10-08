import { createInstallationAccessToken } from "./app";
import { requestGitHubJson, type GitHubFetcher } from "./client";
import type { GitHubAppConfig } from "../config/env";
import type { DiscoveredRepository } from "./types";
import { parseProjectManifest, type ProjectManifest } from "../manifest/project-manifest";

type FilePayload = { type: string; encoding?: string; content?: string };

export async function discoverApprovedManifest(
  config: GitHubAppConfig,
  repository: DiscoveredRepository,
  token: string,
  fetcher?: GitHubFetcher
): Promise<ProjectManifest | null> {
  const url = `${config.apiBaseUrl}/repos/${encodeURIComponent(repository.ownerLogin)}/${encodeURIComponent(repository.name)}/contents/.exechub/project.yml?ref=${encodeURIComponent(repository.defaultBranch)}`;
  let data: FilePayload;
  try {
    data = await requestGitHubJson<FilePayload>(url, { token, fetcher });
  } catch (error) {
    // An absent manifest is a discovered repository, not an approved plan.
    if (error instanceof Error && "status" in error && error.status === 404) return null;
    throw error;
  }
  if (data.type !== "file" || data.encoding !== "base64" || !data.content || data.content.length > 200000) {
    throw new Error(`Invalid project manifest response for ${repository.fullName}.`);
  }
  const manifest = parseProjectManifest(Buffer.from(data.content.replace(/\s/g,""), "base64").toString("utf8"));
  if (manifest.project.repository !== repository.fullName) {
    throw new Error(`Manifest repository mismatch for ${repository.fullName}.`);
  }
  return manifest.roadmap.approved ? manifest : null;
}

export async function discoverInstallationManifests(
  config: GitHubAppConfig,
  installationId: number,
  repositories: readonly DiscoveredRepository[],
  fetcher?: GitHubFetcher
) {
  const { token } = await createInstallationAccessToken(config, installationId, fetcher);
  const manifests: Array<{ repository: DiscoveredRepository; manifest: ProjectManifest }> = [];
  for (const repository of repositories) {
    if (repository.archived) continue;
    const manifest = await discoverApprovedManifest(config, repository, token, fetcher);
    if (manifest) manifests.push({ repository, manifest });
  }
  return manifests;
}

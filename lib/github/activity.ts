import type { GitHubAppConfig } from "../config/env";
import type { DevelopmentActivity } from "../domain/development-activity";
import { requestGitHubJson, type GitHubFetcher } from "./client";
import type { DiscoveredRepository, SynchronizedPullRequest } from "./types";

type CommitPayload = { sha: string; html_url: string; author: { login: string } | null; commit: { message: string; author: { date: string } | null; committer: { date: string } } };
type IssuePayload = { id: number; title: string; html_url: string; state: string; updated_at: string; user: { login: string } | null; pull_request?: unknown };
type ReviewPayload = { id: number; body: string | null; html_url: string; state: string; submitted_at: string | null; user: { login: string } | null };
type WorkflowPayload = { id: number; name: string | null; html_url: string; status: string; conclusion: string | null; updated_at: string; actor: { login: string } | null };

export async function collectRepositoryActivity(config: GitHubAppConfig, repository: DiscoveredRepository, token: string,
  pullRequests: readonly SynchronizedPullRequest[], fetcher?: GitHubFetcher): Promise<DevelopmentActivity[]> {
  const base = `${config.apiBaseUrl}/repos/${encodeURIComponent(repository.ownerLogin)}/${encodeURIComponent(repository.name)}`;
  const selected = pullRequests.filter((pr) => pr.repositoryFullName === repository.fullName)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 10);
  const [commits, issues, workflows, reviews] = await Promise.all([
    requestGitHubJson<CommitPayload[]>(`${base}/commits?per_page=100`, { token, fetcher }),
    requestGitHubJson<IssuePayload[]>(`${base}/issues?state=all&sort=updated&direction=desc&per_page=100`, { token, fetcher }),
    requestGitHubJson<{ workflow_runs: WorkflowPayload[] }>(`${base}/actions/runs?per_page=100`, { token, fetcher }),
    Promise.all(selected.map(async (pr) => ({ pr, reviews: await requestGitHubJson<ReviewPayload[]>(`${base}/pulls/${pr.number}/reviews?per_page=100`, { token, fetcher }) })))
  ]);
  const shared = { repositoryFullName: repository.fullName };
  return [
    ...commits.map((commit): DevelopmentActivity => ({ ...shared, kind: "commit", externalId: commit.sha, title: commit.commit.message.split("\n")[0],
      url: commit.html_url, occurredAt: commit.commit.committer.date, actor: commit.author?.login })),
    ...issues.filter((issue) => !issue.pull_request).map((issue): DevelopmentActivity => ({ ...shared, kind: "issue", externalId: String(issue.id), title: issue.title,
      url: issue.html_url, occurredAt: issue.updated_at, actor: issue.user?.login, state: issue.state })),
    ...workflows.workflow_runs.map((run): DevelopmentActivity => ({ ...shared, kind: "workflow", externalId: String(run.id), title: run.name ?? "Workflow run",
      url: run.html_url, occurredAt: run.updated_at, actor: run.actor?.login, state: run.status, conclusion: run.conclusion ?? undefined })),
    ...reviews.flatMap(({ pr, reviews }) => reviews.filter((review) => review.submitted_at !== null).map((review): DevelopmentActivity => ({ ...shared,
      kind: "review", externalId: String(review.id), title: `Review of PR #${pr.number}: ${pr.title}`, url: review.html_url,
      occurredAt: review.submitted_at!, actor: review.user?.login, state: review.state.toLowerCase() })))
  ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

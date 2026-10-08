export type GitHubInstallationAccessToken = {
  token: string;
  expiresAt: string;
};

export type GitHubRepositoryPayload = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string;
  archived: boolean;
  visibility?: "public" | "private" | "internal";
  private: boolean;
  owner: {
    login: string;
  };
};

export type GitHubInstallationRepositoriesResponse = {
  total_count: number;
  repositories: GitHubRepositoryPayload[];
};

export type GitHubPullRequestPayload = {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  draft: boolean;
  html_url: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  user: {
    login: string;
  } | null;
};

export type DiscoveredRepository = {
  githubRepositoryId: number;
  ownerLogin: string;
  name: string;
  fullName: string;
  htmlUrl: string;
  defaultBranch: string;
  visibility: "public" | "private" | "internal";
  archived: boolean;
};

export type SynchronizedPullRequest = {
  githubPullRequestId: number;
  repositoryFullName: string;
  number: number;
  title: string;
  state: "open" | "closed";
  draft: boolean;
  htmlUrl: string;
  authorLogin?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  mergedAt?: string;
};

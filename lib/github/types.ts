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

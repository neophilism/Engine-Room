export type GitHubFetcher = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;

export class GitHubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly responseBody: string
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export async function requestGitHubJson<T>(
  url: string | URL,
  {
    token,
    method = "GET",
    body,
    fetcher = fetch
  }: {
    token: string;
    method?: "GET" | "POST";
    body?: unknown;
    fetcher?: GitHubFetcher;
  }
): Promise<T> {
  const response = await fetcher(url, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new GitHubApiError(
      `GitHub API request failed with status ${response.status}.`,
      response.status,
      responseBody
    );
  }

  return (await response.json()) as T;
}

export type GitHubAccessDiagnostic = {
  source: "read-token" | "installation" | "missing";
  available: boolean;
  identityHttp: number | null;
  engineRoomHttp: number | null;
  musicAnalyzerHttp: number | null;
  engineRoomPullsHttp: number | null;
  musicAnalyzerPullsHttp: number | null;
  publicControlHttp: number | null;
  reason: string;
};
export declare function probeGitHubAccess(options?: {
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
}): Promise<GitHubAccessDiagnostic>;

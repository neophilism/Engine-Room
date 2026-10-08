import { createSign } from "node:crypto";
import type { GitHubAppConfig } from "../config/env";
import { requestGitHubJson, type GitHubFetcher } from "./client";
import type { GitHubInstallationAccessToken } from "./types";

function encodeJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function createGitHubAppJwt(
  config: GitHubAppConfig,
  nowSeconds = Math.floor(Date.now() / 1000)
) {
  const header = encodeJson({ alg: "RS256", typ: "JWT" });
  const payload = encodeJson({
    iat: nowSeconds - 60,
    exp: nowSeconds + 9 * 60,
    iss: config.appId
  });
  const signingInput = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(config.privateKey).toString("base64url");
  return `${signingInput}.${signature}`;
}

export async function createInstallationAccessToken(
  config: GitHubAppConfig,
  installationId: number,
  fetcher?: GitHubFetcher
): Promise<GitHubInstallationAccessToken> {
  if (!Number.isSafeInteger(installationId) || installationId <= 0) {
    throw new Error("installationId must be a positive integer.");
  }

  const result = await requestGitHubJson<{ token: string; expires_at: string }>(
    `${config.apiBaseUrl}/app/installations/${installationId}/access_tokens`,
    {
      token: createGitHubAppJwt(config),
      method: "POST",
      fetcher
    }
  );

  return {
    token: result.token,
    expiresAt: result.expires_at
  };
}

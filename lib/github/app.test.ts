import { generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { GitHubAppConfig } from "../config/env";
import { createGitHubAppJwt } from "./app";

function decodeSegment(segment: string) {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as Record<string, unknown>;
}

describe("GitHub App authentication", () => {
  it("creates a short-lived RS256 app JWT", () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const config: GitHubAppConfig = {
      appId: "98765",
      privateKey: privatePem,
      apiBaseUrl: "https://api.github.com"
    };

    const jwt = createGitHubAppJwt(config, 1_800_000_000);
    const [header, payload, signature] = jwt.split(".");

    expect(decodeSegment(header)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(decodeSegment(payload)).toEqual({
      iat: 1_799_999_940,
      exp: 1_800_000_540,
      iss: "98765"
    });

    expect(
      verify(
        "RSA-SHA256",
        Buffer.from(`${header}.${payload}`),
        publicKey,
        Buffer.from(signature, "base64url")
      )
    ).toBe(true);
  });
});

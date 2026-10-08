import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  parseGitHubWebhookPayload,
  readGitHubWebhookHeaders,
  verifyGitHubWebhookSignature
} from "./webhook";

describe("GitHub webhook validation", () => {
  it("accepts an exact sha256 HMAC signature", () => {
    const body = JSON.stringify({ zen: "Approachable is better than simple." });
    const secret = "test-secret";
    const signature =
      "sha256=" + createHmac("sha256", secret).update(body).digest("hex");

    expect(verifyGitHubWebhookSignature(body, signature, secret)).toBe(true);
    expect(verifyGitHubWebhookSignature(body + "x", signature, secret)).toBe(false);
  });

  it("rejects malformed signatures", () => {
    expect(verifyGitHubWebhookSignature("{}", "sha256=abc", "secret")).toBe(false);
    expect(verifyGitHubWebhookSignature("{}", "sha1=abc", "secret")).toBe(false);
  });

  it("requires GitHub delivery, event, and signature headers", () => {
    const headers = new Headers({
      "x-github-event": "pull_request",
      "x-github-delivery": "delivery-1",
      "x-hub-signature-256": "sha256=" + "a".repeat(64)
    });

    expect(readGitHubWebhookHeaders(headers)).toEqual({
      event: "pull_request",
      deliveryId: "delivery-1",
      signature: "sha256=" + "a".repeat(64)
    });

    expect(() => readGitHubWebhookHeaders(new Headers())).toThrow(
      "Missing required GitHub webhook headers"
    );
  });

  it("parses JSON and rejects malformed payloads", () => {
    expect(parseGitHubWebhookPayload('{"action":"opened"}')).toEqual({ action: "opened" });
    expect(() => parseGitHubWebhookPayload("{")).toThrow("not valid JSON");
  });
});

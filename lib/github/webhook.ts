import { createHmac, timingSafeEqual } from "node:crypto";

export type GitHubWebhookHeaders = {
  event: string;
  deliveryId: string;
  signature: string;
};

export function readGitHubWebhookHeaders(headers: Headers): GitHubWebhookHeaders {
  const event = headers.get("x-github-event")?.trim();
  const deliveryId = headers.get("x-github-delivery")?.trim();
  const signature = headers.get("x-hub-signature-256")?.trim();

  if (!event || !deliveryId || !signature) {
    throw new Error("Missing required GitHub webhook headers.");
  }

  return { event, deliveryId, signature };
}

export function verifyGitHubWebhookSignature(
  body: string,
  signatureHeader: string,
  secret: string
) {
  if (!signatureHeader.startsWith("sha256=") || !secret) return false;

  const expected = createHmac("sha256", secret).update(body, "utf8").digest("hex");
  const supplied = signatureHeader.slice("sha256=".length);

  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;

  return timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(supplied, "hex")
  );
}

export function parseGitHubWebhookPayload(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new Error("GitHub webhook payload is not valid JSON.");
  }
}

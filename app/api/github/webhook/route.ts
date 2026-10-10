import { NextResponse } from "next/server";
import { getRuntimeConfig } from "../../../../lib/config/env";
import {
  parseGitHubWebhookPayload,
  readGitHubWebhookHeaders,
  verifyGitHubWebhookSignature
} from "../../../../lib/github/webhook";
import { recordGitHubWebhookDelivery } from "../../../../lib/server/github-webhooks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = getRuntimeConfig().github.webhookSecret;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "GitHub webhook secret is not configured." },
      { status: 503 }
    );
  }

  let webhookHeaders;
  try {
    webhookHeaders = readGitHubWebhookHeaders(request.headers);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid webhook headers." }, { status: 400 });
  }

  const body = await request.text();
  if(Buffer.byteLength(body,'utf8')>1_000_000)return NextResponse.json({error:'Webhook payload too large'},{status:413});

  if (!verifyGitHubWebhookSignature(body, webhookHeaders.signature, secret)) {
    return NextResponse.json({ ok: false, error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = parseGitHubWebhookPayload(body);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  const status = await recordGitHubWebhookDelivery({
    deliveryId: webhookHeaders.deliveryId,
    event: webhookHeaders.event,
    payload
  });

  return NextResponse.json(
    { ok: true, deliveryId: webhookHeaders.deliveryId, event: webhookHeaders.event, status },
    { status: status === "inserted" ? 202 : 200 }
  );
}

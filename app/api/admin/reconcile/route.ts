import { NextResponse } from "next/server";
import { requireGitHubAppConfig, getRuntimeConfig } from "../../../../lib/config/env";
import { parseInstallationId } from "../../../../lib/domain/control-settings";
import { authorizeAdmin, trustedWriteOrigin } from "../../../../lib/server/admin-auth";
import { readControlSettings } from "../../../../lib/server/control-settings";
import { reconcileGitHubInstallation } from "../../../../lib/server/github-sync";
import { claimReconciliation, finishReconciliation } from "../../../../lib/server/reconciliation-control";

export const runtime = "nodejs";
export const maxDuration = 120;

function reply(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = authorizeAdmin(request.headers);
  if (auth === "unconfigured") return reply({ error: "Administrative access is not configured." }, 503);
  if (auth !== "authorized") return reply({ error: "Administrative credentials are required." }, 401);
  if (!trustedWriteOrigin(request)) return reply({ error: "Request origin is not trusted." }, 403);
  const runtime = getRuntimeConfig();
  const installationId = parseInstallationId(process.env.GITHUB_INSTALLATION_ID);
  if (!runtime.databaseUrl || !installationId || !runtime.github.appId || !runtime.github.privateKey) {
    return reply({ error: "Database, GitHub App credentials, and a GitHub installation ID are required." }, 503);
  }
  let mode: "manual" | "scheduled";
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 256) return reply({ error: "Request too large." }, 413);
    const payload = JSON.parse(raw) as unknown;
    if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      Object.keys(payload).join(",") !== "mode" ||
      (payload as { mode?: unknown }).mode !== "manual" && (payload as { mode?: unknown }).mode !== "scheduled") {
      return reply({ error: "Choose manual or scheduled reconciliation." }, 400);
    }
    mode = (payload as { mode: "manual" | "scheduled" }).mode;
  } catch {
    return reply({ error: "Invalid JSON request." }, 400);
  }

  let claimed = false;
  try {
    const { settings } = await readControlSettings();
    if (mode === "scheduled" && !settings.githubReconciliationEnabled) {
      return reply({ status: "disabled", message: "Scheduled synchronization is disabled in Settings." }, 200);
    }
    claimed = await claimReconciliation(installationId, settings.githubReconciliationIntervalMinutes, mode === "manual");
    if (!claimed) return reply({ status: "skipped", message: "A run is active or the next interval has not elapsed." }, 200);
    const result = await reconcileGitHubInstallation(requireGitHubAppConfig(), installationId);
    await finishReconciliation(installationId, true);
    return reply({ status: "succeeded", ...result }, 200);
  } catch {
    if (claimed) await finishReconciliation(installationId, false).catch(() => undefined);
    return reply({ error: "Reconciliation failed; inspect server logs and GitHub integration configuration." }, 503);
  }
}

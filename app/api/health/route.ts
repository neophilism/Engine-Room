import { getRuntimeConfig } from "../../../lib/config/env";

export const runtime = "nodejs";

export async function GET() {
  const config = getRuntimeConfig();
  const renderCommit = process.env.RENDER_GIT_COMMIT?.trim();
  return Response.json({
    status: "ok",
    service: "engine-room",
    environment: config.nodeEnv,
    database: { configured: Boolean(config.databaseUrl) },
    release: {
      commit: renderCommit && /^[0-9a-f]{40}$/i.test(renderCommit) ? renderCommit : null
    }
  }, { headers: { "Cache-Control": "no-store" } });
}

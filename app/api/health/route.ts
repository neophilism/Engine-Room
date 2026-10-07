import { getRuntimeConfig } from "../../../lib/config/env";

export const runtime = "nodejs";

export async function GET() {
  const config = getRuntimeConfig();
  return Response.json({
    status: "ok",
    service: "engine-room",
    environment: config.nodeEnv,
    database: {
      configured: Boolean(config.databaseUrl)
    }
  });
}

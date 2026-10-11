import { NextResponse } from "next/server";
import { loadPublicGitHubStatus } from "../../../lib/server/public-github-status";
import { isRequestAdmin } from "../../../lib/server/request-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request:Request) {
  // Private repository names, PR histories and source-health records are
  // executive portfolio metadata. Require an administrator, not any account.
  if(!await isRequestAdmin(request))return NextResponse.json({error:"Administrator required"},{status:403,headers:{"Cache-Control":"no-store"}});
  const status = await loadPublicGitHubStatus();
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}

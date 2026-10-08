import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { parseApprovedManifest, parseApprovedPlanTitles, validateMapping, manifestFingerprint } from "./roadmap-source-utils.mjs";

const url=process.env.DATABASE_URL;
if(!url) throw new Error("DATABASE_URL is required.");
const [manifestYaml,planMarkdown,mappingJson]=await Promise.all([
  readFile(".exechub/project.yml","utf8"),
  readFile("docs/development-plan.md","utf8"),
  readFile(".exechub/approved-pr-mapping.json","utf8")
]);
const manifest=parseApprovedManifest(manifestYaml);
const titles=parseApprovedPlanTitles(planMarkdown);
const numbers=validateMapping(JSON.parse(mappingJson),manifest);
const fingerprint=manifestFingerprint(manifest);
const pool=new Pool({connectionString:url,max:1,connectionTimeoutMillis:15000});
let client;
try{
  client=await pool.connect();
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtext('engine_room_approved_plan_import'))");
  const repos=await client.query(
    "SELECT p.id AS project_id, r.id AS repository_id FROM projects p " +
    "JOIN project_repositories pr ON pr.project_id=p.id " +
    "JOIN repositories r ON r.id=pr.repository_id " +
    "WHERE p.slug='engine-room' AND r.full_name=$1 LIMIT 1",
    [manifest.project.repository]
  );
  if(!repos.rows[0]) throw new Error("Import GitHub repository records before approved roadmap mapping.");
  const {project_id:projectId,repository_id:repositoryId}=repos.rows[0];
  const plans=await client.query(
    "SELECT id,version,source_fingerprint FROM development_plans WHERE project_id=$1 AND status='approved' FOR UPDATE",
    [projectId]
  );
  let planId=plans.rows[0]?.id;
  if(planId){
    if(plans.rows[0].source_fingerprint!==fingerprint) throw new Error("Existing approved-plan fingerprint differs; version review required.");
  }else{
    const existingVersion=await client.query("SELECT version FROM development_plans WHERE project_id=$1 AND version=$2",[projectId,manifest.roadmap.version]);
    if(existingVersion.rows.length) throw new Error("Approved plan version already has a different identity.");
    const result=await client.query(
      "INSERT INTO development_plans (id,project_id,version,status,title,summary,planned_pr_total,approved_at,source_repository,source_ref,source_fingerprint,manifest_snapshot) " +
      "VALUES(gen_random_uuid(),$1,$2,'approved',$3,$4,$5,now(),$6,$7,$8,$9::jsonb) RETURNING id",
      [projectId,manifest.roadmap.version,manifest.project.displayName+" development plan",
       "Approved plan imported from the source-controlled repository",manifest.roadmap.plannedPrs,
       manifest.project.repository,manifest.project.repository+"/.exechub/project.yml",fingerprint,
       JSON.stringify(manifest)]
    );
    planId=result.rows[0]?.id;
    if(!planId)throw new Error("Approved plan could not be persisted.");
    for(const [index,milestone] of manifest.milestones.entries()){
      await client.query(
        "INSERT INTO milestones (id,development_plan_id,ordinal,name,planned_pr_total,status) " +
        "VALUES(gen_random_uuid(),$1,$2,$3,$4,'planned')",
        [planId,index+1,milestone.name,milestone.prs]
      );
    }
  }
  const existingMilestones=await client.query(
    "SELECT id,ordinal FROM milestones WHERE development_plan_id=$1 ORDER BY ordinal",
    [planId]
  );
  if(existingMilestones.rows.length!==manifest.milestones.length)throw new Error("Approved milestones are inconsistent.");
  const milestoneIds=new Map(existingMilestones.rows.map(row=>[Number(row.ordinal),row.id]));
  let milestoneIndex=0;
  let milestoneEnd=manifest.milestones[0].prs;
  for(let ordinal=1;ordinal<=manifest.roadmap.plannedPrs;ordinal++){
    while(ordinal>milestoneEnd){
      milestoneIndex++;
      milestoneEnd+=manifest.milestones[milestoneIndex].prs;
    }
    const number=numbers[ordinal-1];
    const evidence=await client.query(
      "SELECT number,merged_at FROM github_pull_requests WHERE repository_id=$1 AND number=$2",
      [repositoryId,number]
    );
    if(!evidence.rows[0]) throw new Error("Mapped GitHub PR #"+number+" must be synchronized first.");
    await client.query(
      "INSERT INTO planned_pull_requests (id,development_plan_id,milestone_id,repository_id,ordinal,title,description,status,github_pr_number) " +
      "VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6,'planned',$7) " +
      "ON CONFLICT (development_plan_id,ordinal) DO NOTHING",
      [planId,milestoneIds.get(milestoneIndex+1),repositoryId,ordinal,titles.get(ordinal),
       "Verified explicit mapping in .exechub/approved-pr-mapping.json",number]
    );
    const unit=await client.query(
      "SELECT repository_id,github_pr_number FROM planned_pull_requests WHERE development_plan_id=$1 AND ordinal=$2",
      [planId,ordinal]
    );
    if(!unit.rows[0] || (unit.rows[0].repository_id && unit.rows[0].repository_id!==repositoryId) ||
       (unit.rows[0].github_pr_number!==null && unit.rows[0].github_pr_number!==number)) {
      throw new Error("Existing roadmap mapping conflicts at ordinal "+ordinal);
    }
    await client.query(
      "UPDATE planned_pull_requests SET repository_id=$3,github_pr_number=$4,updated_at=now() " +
      "WHERE development_plan_id=$1 AND ordinal=$2 AND (github_pr_number IS NULL OR github_pr_number=$4)",
      [planId,ordinal,repositoryId,number]
    );
  }
  const counts=await client.query(
    "SELECT count(*)::integer AS mapped, " +
    "count(*) FILTER (WHERE gpr.merged_at IS NOT NULL)::integer AS merged " +
    "FROM planned_pull_requests ppr LEFT JOIN github_pull_requests gpr " +
    "ON gpr.repository_id=ppr.repository_id AND gpr.number=ppr.github_pr_number " +
    "WHERE ppr.development_plan_id=$1",[planId]
  );
  if(counts.rows[0].mapped!==40)throw new Error("Incomplete 40-PR mapping.");
  await client.query("COMMIT");
  console.info(JSON.stringify({
    roadmapSource:manifest.project.repository,
    approvedVersion:manifest.roadmap.version,
    mappedPlannedPRs:counts.rows[0].mapped,
    observedMergedPRs:counts.rows[0].merged
  }));
}catch(error){
  if(client)await client.query("ROLLBACK").catch(()=>undefined);
  throw error;
}finally{
  client?.release();
  await pool.end();
}

import {getDatabasePool} from './database';
import {loadPortfolioOverview} from './portfolio-overview';
import {loadDevelopmentVelocity} from './development-velocity';
import {loadPublicGitHubStatus} from './public-github-status';
export async function loadPortfolioSnapshot():Promise<{overview:import("../domain/portfolio-overview").PortfolioOverviewData;velocity:import("../domain/development-velocity").DevelopmentVelocityData|undefined;github:import("./public-github-status").PublicGitHubStatus}>{
 if(!process.env.DATABASE_URL)return {overview:await loadPortfolioOverview(),velocity:await loadDevelopmentVelocity(),github:await loadPublicGitHubStatus()};
 let client:import("pg").PoolClient|undefined;
 try{
  client=await getDatabasePool().connect();
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const revision=(await client.query("SELECT revision::text,changed_at FROM engine_room_live_state WHERE singleton=true")).rows[0];
  const observationId=revision?'database-revision-'+revision.revision:'unavailable';
  const checkedAt=new Date().toISOString();
  const refresh=(await client.query("SELECT observation_id::text,status,coverage,last_started_at,last_finished_at,published_at FROM engine_room_reconciliation_runs WHERE observation_id IS NOT NULL ORDER BY last_started_at DESC LIMIT 1")).rows[0]??null;
  const overview=await loadPortfolioOverview(process.env,client);
  const velocity=await loadDevelopmentVelocity(client);
  const github={...await loadPublicGitHubStatus(process.env,client),observationId,checkedAt};
  await client.query('COMMIT');
  return {overview:{...overview,observationId,checkedAt,reconciliation:refresh?{id:refresh.observation_id,status:refresh.coverage?.status??refresh.status,requested:refresh.coverage?.requested??0,completed:refresh.coverage?.repositories??0,deferred:refresh.coverage?.deferred??0,publishedAt:refresh.published_at?new Date(refresh.published_at).toISOString():null}:undefined},velocity:velocity?{...velocity,observationId,observedAt:checkedAt}:undefined,github};
 }catch{if(client)await client.query('ROLLBACK').catch(()=>{});return {overview:{source:"error" as const,projects:[],statistics:{projects:0,activeProjects:0,completedRoadmapPrs:0,plannedRoadmapPrs:0,percent:0}},velocity:undefined,github:{source:"error" as const,repositoryCount:null,pullRequestCount:null,mergedPullRequestCount:null,mostRecentObservation:null}};}
 finally{client?.release();}
}

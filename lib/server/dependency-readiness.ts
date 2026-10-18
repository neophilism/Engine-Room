import type {PoolClient} from 'pg';
import {evaluateDependencies,type DependencyNode,type ProjectDependencies,type DependencyResult} from '../domain/dependency-readiness';
import {IMPLEMENTATION_PARENTS} from '../domain/project-hierarchy';
export async function loadDependencyReadiness(db:Pick<PoolClient,'query'>){
 const rows=(await db.query(`WITH latest AS (SELECT DISTINCT ON(repository_id) * FROM project_plan_documents
  WHERE path='registry/prs.json' ORDER BY repository_id,version_id DESC)
  SELECT pr.project_id,r.full_name,r.name,d.source_commit,d.runtime_evidence,d.body,i.source_item_id,i.github_pr_numbers,
   i.depends_on,i.external_dependencies,i.external_prerequisites,
   jsonb_array_length(i.github_pr_numbers)>0 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(i.github_pr_numbers) n
    LEFT JOIN github_pull_requests g ON g.repository_id=r.id AND g.number=n.value::integer WHERE g.merged_at IS NULL) AS merged,
   CASE WHEN jsonb_array_length(i.github_pr_numbers)=0 THEN NULL
    WHEN EXISTS(SELECT 1 FROM jsonb_array_elements_text(i.github_pr_numbers) n LEFT JOIN github_pull_requests g ON g.repository_id=r.id AND g.number=n.value::integer
      WHERE g.id IS NULL OR (g.base_ref IS DISTINCT FROM r.default_branch AND (g.release_included IS NULL OR g.release_target_sha IS DISTINCT FROM s.default_branch_sha))) THEN NULL
    ELSE NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(i.github_pr_numbers) n JOIN github_pull_requests g ON g.repository_id=r.id AND g.number=n.value::integer
      WHERE g.base_ref IS DISTINCT FROM r.default_branch AND g.release_included IS FALSE) END AS release_included
  FROM project_repositories pr JOIN repositories r ON r.id=pr.repository_id
  LEFT JOIN github_repository_sync s ON s.repository_id=r.id LEFT JOIN latest d ON d.repository_id=r.id
  LEFT JOIN project_plan_items i ON i.repository_id=r.id AND i.path=d.path AND i.fingerprint=d.fingerprint`)).rows;
 const nodes:DependencyNode[]=rows.filter(row=>row.source_item_id).map(row=>({key:row.full_name+'#'+row.source_item_id,
  repository:row.full_name,unitId:row.source_item_id,mapped:row.github_pr_numbers?.length>0,merged:row.merged,
  releaseIncluded:row.release_included,sourceCommit:row.source_commit,
  dependencies:[...(row.depends_on??[]).map((id:string)=>row.full_name+'#'+id),...(row.external_dependencies??[]).map((d:{repository:string;unitId:string})=>d.repository+'#'+d.unitId)],prerequisites:row.external_prerequisites??[]}));
 const result=new Map<string,ProjectDependencies>();
 for(const projectId of new Set<string>(rows.map(row=>row.project_id))){
  const own=rows.filter(row=>row.project_id===projectId);
  const requested=own.flatMap(row=>[...(row.depends_on??[]).map((id:string)=>row.full_name+'#'+id),...(row.external_dependencies??[]).map((d:{repository:string;unitId:string})=>d.repository+'#'+d.unitId)]);
  const requirements:DependencyResult[]=evaluateDependencies(nodes,requested);
  for(const row of own){
   for(const text of row.external_prerequisites??[])requirements.push({key:row.full_name+'#'+row.source_item_id,state:'incomplete',reasons:['Unresolved prerequisite: '+text]});
  }
  // Runtime lock evidence is imported once per source document, not repeated per unit.
  const documents=new Map(own.map(row=>[row.full_name,row]));
  for(const row of documents.values()){
   let declarations:unknown=[];try{declarations=JSON.parse(row.body??'{}').runtimeDependencies??[];}catch{/* Remains unknown below. */}
   if(Array.isArray(declarations))for(const declared of declarations){
    const evidence=(row.runtime_evidence??[]).find((x:{repository:string})=>x.repository===declared.repository);
    const reasons:string[]=[];
    if(!evidence?.matched)reasons.push('Pinned engine lock was not verified against the immutable plan source: '+declared.repository);
    if(declared.requireStableRelease&&/-/.test(evidence?.version??declared.version??''))reasons.push('Pinned engine is a prerelease: '+(evidence?.version??declared.version));
    requirements.push({key:'runtime:'+declared.repository,state:reasons.length?'unknown':'satisfied',reasons});
   }
   const slug=row.name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
   if(IMPLEMENTATION_PARENTS[slug]){
    if(!own.some(x=>x.external_dependencies?.length))requirements.push({key:'upstream:'+IMPLEMENTATION_PARENTS[slug],state:'unknown',reasons:['Known upstream relationship has no reconciled source-owned prerequisite declarations']});
   }
  }
  const unique=[...new Map(requirements.map(x=>[x.key,x])).values()];
  const status=unique.some(x=>x.state==='incomplete')?'incomplete':unique.some(x=>x.state==='unknown')?'unknown':unique.length?'satisfied':'not-declared';
  result.set(projectId,{status,requirements:unique,note:'Prerequisite evidence is separate from accepted PR counts. Production readiness requires current deployment and end-to-end acceptance evidence.'});
 }
 return result;
}

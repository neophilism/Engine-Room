export type DependencyState='satisfied'|'incomplete'|'unknown';
export type DependencyNode={key:string;repository:string;unitId:string;mapped:boolean;merged:boolean;
 releaseIncluded:boolean|null;sourceCommit:string|null;dependencies:string[];prerequisites:string[]};
export type DependencyResult={key:string;state:DependencyState;reasons:string[]};
/** Cross-repository cycles, absent mappings and missing release evidence never imply readiness. */
export function evaluateDependencies(nodes:readonly DependencyNode[],requested:readonly string[]):DependencyResult[]{
 const byKey=new Map(nodes.map(node=>[node.key,node]));
 const visit=(key:string,path:Set<string>):DependencyResult=>{
  if(path.has(key))return {key,state:'unknown',reasons:['Dependency cycle: '+key]};
  const node=byKey.get(key);if(!node)return {key,state:'unknown',reasons:['Source unit not observed: '+key]};
  const next=new Set(path);next.add(key);
  const children=node.dependencies.map(dependency=>visit(dependency,next));
  const reasons=[...node.prerequisites.map(x=>'Unresolved prerequisite: '+x),...children.flatMap(x=>x.reasons)];
  let state:DependencyState='satisfied';
  if(!node.mapped){state='unknown';reasons.push('Scope-to-PR mapping not reconciled: '+key);}
  else if(!node.merged){state='incomplete';reasons.push('Required source work has unmerged PRs: '+key);}
  if(!node.sourceCommit){state=state==='incomplete'?state:'unknown';reasons.push('Immutable source commit not observed: '+key);}
  if(node.releaseIncluded!==true){state=node.releaseIncluded===false?'incomplete':state==='incomplete'?state:'unknown';reasons.push('Release inclusion not verified: '+key);}
  if(node.prerequisites.length||children.some(x=>x.state==='incomplete'))state='incomplete';
  else if(children.some(x=>x.state==='unknown')&&state!=='incomplete')state='unknown';
  return {key,state,reasons:[...new Set(reasons)]};
 };
 return [...new Set(requested)].map(key=>visit(key,new Set()));
}
export type ProjectDependencies={status:DependencyState|'not-declared';requirements:DependencyResult[];note:string};

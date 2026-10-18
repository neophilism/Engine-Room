export type DependencyState='satisfied'|'incomplete'|'unknown';
export type DependencyNode={key:string;repository:string;unitId:string;mapped:boolean;merged:boolean;
 releaseIncluded:boolean|null;sourceCommit:string|null;dependencies:string[];prerequisites:string[]};
export type DependencyResult={key:string;state:DependencyState;reasons:string[]};
/** Cross-repository cycles, absent mappings and missing release evidence never imply readiness. */
export function evaluateDependencies(nodes:readonly DependencyNode[],requested:readonly string[]):DependencyResult[]{
 const byKey=new Map(nodes.map(node=>[node.key,node]));
 const keys=[...new Set(requested)];
 // Materialize each reachable edge once. Rewalking shared prerequisites for
 // every path makes even a small dense acyclic plan grow exponentially.
 const graph=new Map<string,string[]>(),reverse=new Map<string,string[]>();
 const pending=[...keys];
 while(pending.length){
  const key=pending.pop()!;if(graph.has(key))continue;
  const dependencies=[...new Set(byKey.get(key)?.dependencies??[])];
  graph.set(key,dependencies);
  for(const child of dependencies){
   const parents=reverse.get(child)??[];parents.push(key);reverse.set(child,parents);
   if(!graph.has(child))pending.push(child);
  }
 }
 // Iterative Kosaraju traversal avoids call-stack overflow on long plans.
 const visited=new Set<string>(),finished:string[]=[];
 for(const root of graph.keys()){
  const stack:[string,boolean][]=[[root,false]];
  while(stack.length){
   const [key,expanded]=stack.pop()!;
   if(expanded){finished.push(key);continue;}
   if(visited.has(key))continue;visited.add(key);stack.push([key,true]);
   for(const child of graph.get(key)??[])if(!visited.has(child))stack.push([child,false]);
  }
 }
 const componentOf=new Map<string,number>(),components:string[][]=[];
 for(const root of finished.reverse()){
  if(componentOf.has(root))continue;
  const id=components.length,members:string[]=[],stack=[root];
  componentOf.set(root,id);
  while(stack.length){
   const key=stack.pop()!;members.push(key);
   for(const parent of reverse.get(key)??[])if(!componentOf.has(parent)){componentOf.set(parent,id);stack.push(parent);}
  }
  components.push(members);
 }
 const children=components.map(()=>new Set<number>()),parents=components.map(()=>new Set<number>());
 for(const [key,dependencies] of graph){
  const id=componentOf.get(key)!;
  for(const child of dependencies){const other=componentOf.get(child)!;if(id!==other){children[id].add(other);parents[other].add(id);}}
 }
 const remaining=children.map(set=>set.size),ready=remaining.flatMap((count,id)=>count===0?[id]:[]);
 const results=new Map<number,{state:DependencyState;reasons:Set<string>}>();
 for(let next=0;next<ready.length;next++){
  const id=ready[next],members=components[id],reasons=new Set<string>();
  let state:DependencyState='satisfied';
  const include=(other:DependencyState)=>{if(other==='incomplete'||other==='unknown'&&state==='satisfied')state=other;};
  if(members.length>1||graph.get(members[0])?.includes(members[0])){
   include('unknown');for(const key of members)reasons.add('Dependency cycle: '+key);
  }
  for(const key of members){
   const node=byKey.get(key);
   if(!node){include('unknown');reasons.add('Source unit not observed: '+key);continue;}
   if(!node.mapped){include('unknown');reasons.add('Scope-to-PR mapping not reconciled: '+key);}
   else if(!node.merged){include('incomplete');reasons.add('Required source work has unmerged PRs: '+key);}
   if(!node.sourceCommit){include('unknown');reasons.add('Immutable source commit not observed: '+key);}
   if(node.releaseIncluded!==true){include(node.releaseIncluded===false?'incomplete':'unknown');reasons.add('Release inclusion not verified: '+key);}
   if(node.prerequisites.length)include('incomplete');
   for(const text of node.prerequisites)reasons.add('Unresolved prerequisite: '+text);
  }
  for(const child of children[id]){const result=results.get(child)!;include(result.state);for(const reason of result.reasons)reasons.add(reason);}
  results.set(id,{state,reasons});
  for(const parent of parents[id])if(--remaining[parent]===0)ready.push(parent);
 }
 return keys.map(key=>{const result=results.get(componentOf.get(key)!)!;return {key,state:result.state,reasons:[...result.reasons]};});
}
export type ProjectDependencies={status:DependencyState|'not-declared';requirements:DependencyResult[];note:string};

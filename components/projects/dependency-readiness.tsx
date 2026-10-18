import React from 'react';
import type {ProjectDependencies} from '../../lib/domain/dependency-readiness';
export function DependencyReadout({data}:{data?:ProjectDependencies}){
 return <div className="metric-freshness" role="status"><strong>Prerequisite evidence: {data?.status??'unknown'}</strong>
  <p>{data?.note??'Dependency declarations have not been reconciled. No overall completion or deployment claim is established.'}</p>
  {!!data?.requirements.length&&<details><summary>Required upstream work and unresolved evidence ({data.requirements.length})</summary>
   <ul>{data.requirements.map(item=><li key={item.key}><strong>{item.key}</strong> · {item.state}{item.reasons.map(reason=><p key={reason}>{reason}</p>)}</li>)}</ul></details>}
 </div>;
}

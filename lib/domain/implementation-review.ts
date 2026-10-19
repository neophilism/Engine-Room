export type ImplementationReview={implementation:'implemented'|'remaining_implementation';reviewedAt:string;softwareGap:string|null;activationRequirement:string;sourceFiles:{path:string;sha256:string}[]};
/** Source-authored software findings remain distinct from GitHub acceptance and deployment. */
export function sourceImplementationReview(metadata:unknown):ImplementationReview|undefined{
 if(!metadata||typeof metadata!=='object')return;
 const value=(metadata as {implementationReview?:unknown}).implementationReview;
 if(!value||typeof value!=='object')return;
 const r=value as ImplementationReview;
 if(!['implemented','remaining_implementation'].includes(r.implementation)||typeof r.reviewedAt!=='string'||!Number.isFinite(Date.parse(r.reviewedAt))||
  typeof r.activationRequirement!=='string'||!r.activationRequirement.trim()||r.activationRequirement.length>4000||
  !Array.isArray(r.sourceFiles)||!r.sourceFiles.length||r.sourceFiles.length>100||r.sourceFiles.some(f=>!f||typeof f.path!=='string'||!f.path||f.path.length>500||!/^([a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+$/.test(f.path)||f.path.split('/').includes('..')||!(/^[a-f0-9]{64}$/).test(f.sha256))||
  (r.implementation==='implemented'?r.softwareGap!==null:typeof r.softwareGap!=='string'||!r.softwareGap.trim()||r.softwareGap.length>4000))return;
 return {implementation:r.implementation,reviewedAt:r.reviewedAt,softwareGap:r.softwareGap,activationRequirement:r.activationRequirement,sourceFiles:r.sourceFiles.map(f=>({path:f.path,sha256:f.sha256}))};
}

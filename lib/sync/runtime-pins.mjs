export function verifyRuntimePins(declarations,lock){
 if(!Array.isArray(declarations)||declarations.length>16)throw new Error('Invalid runtime dependency declarations');
 return declarations.map(d=>{
  if(!d||!/^[-\w.]+\/[-\w.]+$/.test(d.repository)||!/^[a-f0-9]{40}$/.test(d.sourceCommit)||typeof d.version!=='string')throw new Error('Invalid runtime source pin');
  const engine=lock?.engine;
  return {repository:d.repository,sourceCommit:engine?.sourceCommit??null,version:engine?.version??null,
   matched:engine?.repository===d.repository&&engine?.sourceCommit===d.sourceCommit&&engine?.version===d.version};
 });
}

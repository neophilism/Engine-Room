import {parsePrRegistry} from '../../registry/pr-contract.mjs';
export {STRUCTURED_PR_PATH,PR_SNAPSHOT_DIRECTORY,attachObservedWorkIds} from '../../registry/pr-contract.mjs';
export function parseStructuredPrRegistry(body, repositoryName) {
  const result=parsePrRegistry(body, 'neophilism/' + repositoryName);
  result.items=result.items.map((item,index)=>({...item,metadata:result.document.units[index]}));
  return result;
}

export function snapshotPrToGitHub(record) {
  return {
    id:record.id,
    number:record.number,
    title:record.title,
    state:record.state,
    draft:record.draft,
    html_url:record.url,
    created_at:record.createdAt,
    updated_at:record.updatedAt,
    closed_at:record.closedAt,
    merged_at:record.mergedAt,
    head:record.headSha ? {sha:record.headSha} : undefined,
    base:record.baseRef ? {ref:record.baseRef} : undefined,
    merge_commit_sha:record.mergeCommitSha ?? null
  };
}


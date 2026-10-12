// @vitest-environment node
import {describe,it,expect} from 'vitest';
import {githubTimestamp,latestDevelopmentUpdate} from './project-activity.mjs';
const repo={html_url:'https://github.com/neophilism/Engine-Room'};
const pr={number:89,title:'Refresh repairs',html_url:repo.html_url+'/pull/89',created_at:'2026-10-12T12:00:00Z',updated_at:'2026-10-12T13:00:00Z',merged_at:'2026-10-12T13:00:00Z',merge_commit_sha:'abc'};
describe('source-backed project updates',()=>{
  it('accepts webhook epoch seconds as well as REST ISO timestamps',()=>{
    expect(githubTimestamp(1791806400)).toBe(new Date(1791806400000).toISOString());
    expect(githubTimestamp('2026-10-12T12:00:00Z')).toBe('2026-10-12T12:00:00.000Z');
    expect(githubTimestamp(undefined)).toBeNull();
  });
  it('shows a merged PR instead of mislabeling its squash commit as a direct edit',()=>{
    expect(latestDevelopmentUpdate(repo,[pr],{sha:'abc',commit:{committer:{date:pr.merged_at}},html_url:repo.html_url+'/commit/abc'})?.kind).toBe('pr-merged');
  });
  it('reports a direct default-branch commit with its original time',()=>{
    const at='2026-10-12T14:00:00Z';
    expect(latestDevelopmentUpdate(repo,[pr],{sha:'def',commit:{committer:{date:at},message:'Edit README'},html_url:repo.html_url+'/commit/def'})).toMatchObject({kind:'direct-commit',at:'2026-10-12T14:00:00.000Z'});
  });
  it('does not claim a PR push from a comment or label update timestamp',()=>{
    expect(latestDevelopmentUpdate(repo,[{...pr,merged_at:null,updated_at:'2026-10-12T14:00:00Z'}])?.kind).toBe('pr-updated');
  });
  it('does not invent an activity time for an empty repository',()=>{
    expect(latestDevelopmentUpdate(repo,[])).toBeNull();
  });
});

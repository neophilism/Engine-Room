export const UPDATE_KINDS = ['pr-opened','pr-merged','pr-closed','pr-updated','pr-pushed','direct-commit','repository-push'];
export function githubTimestamp(value) {
  const milliseconds=typeof value==='number'?value*1000:typeof value==='string'?Date.parse(value):NaN;
  return Number.isFinite(milliseconds)?new Date(milliseconds).toISOString():null;
}
const priority = { 'pr-merged': 7, 'pr-pushed': 6, 'pr-opened': 5, 'pr-closed': 4, 'direct-commit': 3, 'repository-push': 2, 'pr-updated': 1 };
export function latestDevelopmentUpdate(repo, prs, commit) {
  const candidates = [];
  const add = (kind, at, title, url, ref) => {
    if (!UPDATE_KINDS.includes(kind) || !Number.isFinite(Date.parse(at))) return;
    candidates.push({kind, at:new Date(at).toISOString(), title, url, ref});
  };
  for (const pr of prs) {
    if (pr.merged_at) add('pr-merged', pr.merged_at, `PR #${pr.number} merged: ${pr.title}`, pr.html_url, String(pr.number));
    else if (pr.closed_at) add('pr-closed', pr.closed_at, `PR #${pr.number} closed: ${pr.title}`, pr.html_url, String(pr.number));
    else add('pr-opened', pr.created_at, `PR #${pr.number} opened: ${pr.title}`, pr.html_url, String(pr.number));
    // updated_at can be a comment, label or review, so it cannot prove a push.
    if (Date.parse(pr.updated_at) > Date.parse(pr.merged_at || pr.closed_at || pr.created_at)) {
      add('pr-updated',pr.updated_at,`PR #${pr.number} updated: ${pr.title}`,pr.html_url,String(pr.number));
    }
  }
  const merged = commit && prs.find(pr => pr.merge_commit_sha === commit.sha && pr.merged_at);
  if (commit?.sha && !merged) add('direct-commit',commit.commit?.committer?.date,
    commit.commit?.message?.split('\n')[0] || 'Default branch commit',commit.html_url,commit.sha);
  const knownAt = Math.max(0,...candidates.map(c=>Date.parse(c.at)));
  // A repository push may be to any branch. Do not invent a direct edit or PR association.
  const pushedAt=githubTimestamp(repo.pushed_at);
  if (Date.parse(pushedAt) > knownAt + 10_000) add('repository-push',pushedAt,
    'Repository push; branch not identified by repository metadata',repo.html_url,repo.pushed_at);
  return candidates.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)||priority[b.kind]-priority[a.kind])[0] || null;
}

export async function persistLatestActivity(db, repositoryId, update) {
  if (!update) return;
  if (!UPDATE_KINDS.includes(update.kind) || !Number.isFinite(Date.parse(update.at)) ||
      !/^https:\/\/github\.com\//.test(update.url || '')) throw new Error('Invalid GitHub activity');
  await db.query(`INSERT INTO repository_latest_activity(repository_id,kind,occurred_at,title,html_url,source_ref)
    VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(repository_id) DO UPDATE SET
    kind=excluded.kind,occurred_at=excluded.occurred_at,title=excluded.title,html_url=excluded.html_url,
    source_ref=excluded.source_ref,observed_at=now()
    WHERE excluded.occurred_at >= repository_latest_activity.occurred_at`,
    [repositoryId,update.kind,update.at,update.title,update.url,update.ref]);
}

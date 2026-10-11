import { CANONICAL_ROADMAP_PATH } from './canonical-roadmap.mjs';
import { githubToken } from './github-runtime.mjs';
import { parsePlanItems, persistPlanDocument } from './plan-import.mjs';

/**
 * Import authoritative development plans WITHOUT consuming GitHub API quota.
 *
 * Full PR reconciliation uses the rate-limited GitHub REST API and can lag for
 * hours. Roadmap discovery must not inherit that failure: every documented
 * project can display an honest 0/N progress tube while PR evidence catches up.
 *
 * Read-only public raw.githubusercontent.com sources. No bearer secrets are
 * sent to that host. Repository and path coordinates are taken from registered
 * DB projects and the versioned, reviewed source inventory.
 */
export async function reconcilePlanSources(pool, {
  fetcher = fetch,
  owner = 'neophilism',
  repositoryLimit = 100,
  concurrency = 4
} = {}) {
  if (!/^[a-z\d-]+$/i.test(owner)) throw new Error('Invalid repository owner');
  const result = await pool.query(
    'SELECT DISTINCT r.id,r.name,r.full_name,r.default_branch ' +
    'FROM repositories r JOIN project_repositories pr ON pr.repository_id=r.id ' +
    'WHERE lower(r.owner_login)=lower($1) AND NOT r.archived ORDER BY r.name LIMIT $2',
    [owner,repositoryLimit]
  );
  const names = result.rows;
  const completed = [];
  const errors = [];
  // Private repository raw files require the same token as PR reconciliation.
  const token = await githubToken(process.env, fetcher);
  let cursor = 0;

  async function fetchPublicFile(repo, path) {
    if (!/^[a-z0-9._-]+\/[a-z0-9._-]+$/i.test(repo.full_name) ||
        !/^[a-z0-9._/-]+$/i.test(path) ||
        path.startsWith('/') || path.includes('..') ||
        !/^[a-z0-9._/-]+$/i.test(repo.default_branch)) {
      throw new Error('Invalid source repository coordinate');
    }
    const url = 'https://raw.githubusercontent.com/' +
      repo.full_name + '/' + encodeURIComponent(repo.default_branch) + '/' + path;
    const response = await fetcher(url, {
      headers: { Accept: 'text/plain', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, signal: AbortSignal.timeout(15000)
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Plan source HTTP ' + response.status);
    const body = await response.text();
    if (Buffer.byteLength(body) > 500000) throw new Error('Plan source exceeds safety limit');
    return body;
  }

  async function processRepo(repo) {
    const path=CANONICAL_ROADMAP_PATH;
    const body=await fetchPublicFile(repo,path);
    if(body===null)throw new Error('Canonical roadmap missing: '+path);
    const prs=(await pool.query(
      'SELECT number,title FROM github_pull_requests WHERE repository_id=$1',
      [repo.id])).rows;
    const items=parsePlanItems(body,path,repo.name,prs,null);
    // Empty plans are only valid where they are explicitly unverified.
    if(!items.length && JSON.parse(body).planVerified!==false)
      throw new Error('No verified work units in canonical roadmap.');
    const db=await pool.connect();
    try {
      await db.query('BEGIN');
      await persistPlanDocument(db,repo,{path,body,ref:repo.default_branch,items});
      await db.query('COMMIT');
    } catch(error) {
      await db.query('ROLLBACK');
      throw error;
    } finally {
      db.release();
    }
    completed.push({repo:repo.name,plans:[{path,units:items.length}]});
  }

  async function worker() {
    while(cursor < names.length) {
      const repo=names[cursor++];
      try { await processRepo(repo); }
      catch(error) {
        errors.push({
          repo: repo.name,
          error: error instanceof Error ? error.message.slice(0,200) : 'Unknown source failure'
        });
      }
    }
  }
  await Promise.all(Array.from({length:Math.min(names.length,Math.max(1,concurrency))}, worker));
  return {
    registered: result.rows.length,
    withDocumentedSource: names.length,
    imported: completed.length,
    failed: errors.length,
    completed,
    errors
  };
}

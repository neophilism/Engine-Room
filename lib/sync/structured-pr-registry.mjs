/**
 * Versioned, machine-readable PR register.
 * Each work unit is explicitly mapped to real GitHub PR numbers; prose is never parsed.
 * GitHub timestamps remain the evidence for merge/closed/open status.
 */
export const STRUCTURED_PR_PATH = 'registry/prs.json';
export const PR_SNAPSHOT_DIRECTORY = 'registry/pr-snapshots';
const positive = n => Number.isSafeInteger(n) && n > 0;
const validTime = t => typeof t === 'string' && Number.isFinite(Date.parse(t)) && new Date(t).toISOString() === t;

export function parseStructuredPrRegistry(body, repositoryName) {
  if (typeof body !== 'string' || Buffer.byteLength(body, 'utf8') > 1000000)
    throw new Error('PR registry body exceeds the size limit.');
  let doc;
  try { doc = JSON.parse(body); }
  catch { throw new Error('PR registry must be valid JSON.'); }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc) ||
      doc.schemaVersion !== 1 || doc.repository !== 'neophilism/' + repositoryName ||
      !positive(doc.roadmapVersion) || !validTime(doc.observedAt) ||
      typeof doc.planVerified !== 'boolean' ||
      !Array.isArray(doc.units) || doc.units.length > 2000 ||
      !Array.isArray(doc.pullRequests) || doc.pullRequests.length > 2500 ||
      !Number.isSafeInteger(doc.plannedPrCount) || doc.plannedPrCount !== doc.units.length ||
      (doc.planVerified !== (doc.units.length > 0)))
    throw new Error('Invalid repository identity, plan version, total or observation time.');
  const numbers = new Set();
  const prs = doc.pullRequests.map(record => {
    if (!record || typeof record !== 'object' || !positive(record.id) ||
        !positive(record.number) || numbers.has(record.number) ||
        typeof record.title !== 'string' || !record.title.trim() ||
        !['open','closed'].includes(record.state) ||
        !validTime(record.createdAt) || !validTime(record.updatedAt) ||
        (record.mergedAt !== null && !validTime(record.mergedAt)) ||
        (record.closedAt !== null && !validTime(record.closedAt)) ||
        (record.state === 'open' && (record.mergedAt !== null || record.closedAt !== null)) ||
        (record.mergedAt !== null && record.state !== 'closed') ||
        (record.mergedAt !== null && Date.parse(record.mergedAt) > Date.parse(doc.observedAt) + 300000) ||
        record.draft !== true && record.draft !== false)
      throw new Error('Invalid, duplicate, or contradictory GitHub PR record.');
    numbers.add(record.number);
    return record;
  });
  const unitIds = new Set();
  const items = doc.units.map((unit, index) => {
    if (!unit || typeof unit !== 'object' || typeof unit.id !== 'string' ||
        !/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/.test(unit.id) || !/\d/.test(unit.id) ||
        unitIds.has(unit.id) || typeof unit.title !== 'string' ||
        !unit.title.trim() || unit.title.length > 240 ||
        !Array.isArray(unit.prs) || unit.prs.length > 100 ||
        unit.prs.some(n => !positive(n)) || new Set(unit.prs).size !== unit.prs.length)
      throw new Error('Invalid unit ID, title, or PR references at item ' + (index + 1));
    unitIds.add(unit.id);
    return {
      ordinal:index + 1, sourceItemId:unit.id, title:unit.title.trim(),
      scope:unit.origin === 'addition' || unit.origin === 'added' ? 'addition' : 'original',
      numbers:unit.prs,
      reason:unit.prs.length ? 'Explicit structured registry PR mapping' : null
    };
  });
  return {document:doc,items,pullRequests:prs};
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

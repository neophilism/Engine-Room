import { createHash } from 'node:crypto';
import { bumpRevision } from './github-runtime.mjs';
import reviewedEvidence from '../config/portfolio-plan-evidence.json' with {type:'json'};

export function normalizedWorkTitle(title) {
  return title.toLowerCase().replace(/^\s*(?:pr|pull request|roadmap pr)\s*#?\d+\s*[:.—–-]?\s*/i,'')
    .replace(/[^a-z0-9]+/g,' ').trim();
}

/**
 * Approved Exechub manifests are a documented denominator even when PRs do
 * not exist yet. Mappings are accepted only from a separate, explicitly
 * versioned file; an ordinal is NEVER guessed to be a GitHub PR number.
 */
export function parseApprovedManifestItems(body, repoName, mappingBody = null) {
  if (typeof body !== "string" || body.length > 64000) throw new Error("Invalid approved manifest.");
  const repository = body.match(/^  repository:\s*(\S+)\s*$/m)?.[1];
  const version = Number(body.match(/^  version:\s*(\d+)\s*$/m)?.[1]);
  const total = Number(body.match(/^  planned_prs:\s*(\d+)\s*$/m)?.[1]);
  const approved = /^  approved:\s*true\s*$/m.test(body);
  const milestones = [...body.matchAll(/^  - name:\s*(.+)\r?\n    prs:\s*(\d+)\s*$/gm)].map((m) => ({ name: m[1].trim(), count: Number(m[2]) }));
  if (repository !== 'neophilism/' + repoName || !Number.isSafeInteger(version) || version < 1 ||
    !Number.isSafeInteger(total) || total < 1 || total > 1000 || !approved ||
    milestones.length === 0 || milestones.some((m) => m.count < 1 || !Number.isSafeInteger(m.count)) ||
    milestones.reduce((sum, m) => sum + m.count, 0) !== total) {
    throw new Error("Approved source manifest is invalid or mismatches the repository.");
  }
  let numbers = null;
  if (mappingBody !== null) {
    const mapping = JSON.parse(mappingBody);
    if (mapping.sourceRepository !== repository || mapping.roadmapVersion !== version ||
      !Array.isArray(mapping.pullRequestNumbers) || mapping.pullRequestNumbers.length !== total ||
      mapping.pullRequestNumbers.some((n) => n !== null && (!Number.isSafeInteger(n) || n < 1)) ||
      new Set(mapping.pullRequestNumbers.filter((n) => n !== null)).size !==
        mapping.pullRequestNumbers.filter((n) => n !== null).length) {
      throw new Error("Approved PR mapping must exactly match the source manifest.");
    }
    numbers = mapping.pullRequestNumbers;
  }
  const items = [];
  for (const milestone of milestones) {
    for (let i = 0; i < milestone.count; i++) {
      const ordinal = items.length + 1;
      const number = numbers?.[ordinal - 1];
      items.push({
        ordinal, title: milestone.name + ' — planned unit ' + ordinal, scope: 'original',
        numbers: number ? [number] : [],
        reason: number ? 'Explicit approved Exechub PR mapping' : null
      });
    }
  }
  return items;
}

/** Only explicit source mappings or one unambiguous, exact title match establish completion evidence. */
export function parsePlanItems(body, path, repoName, pullRequests=[], mappingBody=null) {
  if (path === '.exechub/project.yml') return parseApprovedManifestItems(body,repoName,mappingBody);
  let items=[];
  if (path.endsWith('.json')) {
    const data=JSON.parse(body);
    const prefixes={'Distributed-Audio-Engine':'DAE','Distributed-Radio-Engine':'DRE','SceneSignal':'SS','TrackZero':'TZ'};
    const prefix=prefixes[repoName];
    // Music Operations Engine documents completed, partial and unstarted
    // milestones separately. PR evidence must not complete a partial item.
    if (Array.isArray(data.milestones)) {
      if (data.project !== repoName) throw new Error('Roadmap milestones belong to a different repository.');
      const count = Number(data.baselineMilestones) + Number(data.addedMilestones);
      if (!Number.isSafeInteger(count) || count !== data.milestones.length) throw new Error('Inconsistent milestone totals.');
      const seen = new Set();
      for (const row of data.milestones) {
        const ordinal = Number(row.id);
        if (!Number.isSafeInteger(ordinal) || ordinal < 1 || ordinal > count || seen.has(ordinal) || typeof row.title !== 'string') {
          throw new Error('Invalid roadmap milestone ordinal.');
        }
        seen.add(ordinal);
        const explicit = Array.isArray(row.pullRequests) ? row.pullRequests : [];
        if (explicit.some(n => !Number.isSafeInteger(n) || n < 1)) throw new Error('Invalid milestone PR evidence.');
        const implemented = row.implementationStatus === 'implemented';
        items.push({ordinal,title:row.title,numbers:implemented ? [...new Set(explicit)] : [],
          reason:implemented && explicit.length ? 'Source milestone verified implemented; explicit PR references' : null,
          scope:row.origin==='added'||row.origin==='addition'?'addition':'original'});
      }
      return items.sort((a,b)=>a.ordinal-b.ordinal);
    }
    for (const row of data.items||[]) {
      const belongs=row.repository===repoName || row.repo===repoName || prefix && row.id?.startsWith(prefix+'-');
      if (!belongs) continue;
      const ordinal=Number(row.id?.split('-').at(-1)||row.ordinal);
      if (!Number.isSafeInteger(ordinal)||ordinal<=0||typeof row.title!=='string') throw new Error('Invalid roadmap item');
      const numbers=row.github_prs|| (row.github_pr?[row.github_pr]:[]);
      if (!Array.isArray(numbers)||numbers.some(n=>!Number.isSafeInteger(n)||n<=0)) throw new Error('Invalid roadmap evidence');
      items.push({ordinal,title:row.title,sourceItemId:row.id,numbers:[...new Set(numbers)],reason:numbers.length?'Explicit repository roadmap evidence':null,scope:row.origin==='addition'||row.origin==='added'?'addition':'original'});
    }
  } else {
    const section=body.match(/^#{1,4}\s+(?:MVP\s+)?(?:development\s+)?roadmap\s*\n([\s\S]*?)(?=^#{1,4}\s|$(?![\s\S]))/im)?.[1]||body;
    const headings=[...section.matchAll(/^(?:#{1,4}\s+)?(?:\*\*)?PR\s*#?(\d+)\s*[:.—–-]\s*(.+)$/gim)];
    const rows=headings.length?headings:[...section.matchAll(/^(\d+)\.\s+(?!\[)(.+)$/gm)];
    items=rows.map(r=>({ordinal:Number(r[1]),title:r[2].replace(/\*\*/g,'').replace(/\s+[—–-]\s+complete.*$/i,'').trim(),numbers:[],reason:null,scope:'original'}));
    if (new Set(items.map(x=>x.ordinal)).size!==items.length) return []; // Ordinary prose with multiple numbered lists is not a roadmap.
  }
  for (const item of items) {
    if (item.numbers.length) continue;
    // A unique PR title like "DRE-09: station accounting" is stronger
    // evidence than approximate title similarity and needs no ordinal guess.
    const sourceItemId=item.sourceItemId;
    if (typeof sourceItemId === 'string' && /^(?:DAE|DRE|SS|TZ)-\d+$/i.test(sourceItemId)) {
      const prefix = new RegExp('^' + sourceItemId + '(?![A-Za-z0-9-])', 'i');
      const idMatches=pullRequests.filter(pr=>prefix.test(pr.title.trim()));
      if (idMatches.length===1) {
        item.numbers=[idMatches[0].number];
        item.reason='Unique explicit roadmap ID in GitHub PR title';
        continue;
      }
    }
    const key=normalizedWorkTitle(item.title);
    const reviewed=(reviewedEvidence[repoName]||[]).find(row=>row.sourcePath===path&&normalizedWorkTitle(row.sourceTitle)===key);
    if(reviewed){item.numbers=reviewed.numbers;item.reason=reviewed.reason;continue;}
    const matches=pullRequests.filter(pr=>normalizedWorkTitle(pr.title)===key);
    if (key && matches.length===1) {item.numbers=[matches[0].number];item.reason='Unique exact work-title match';}
  }
  return items;
}

export async function persistPlanDocument(db,repo,{path,body,ref,items,sourceUrl:providedSourceUrl,title}) {
  const fingerprint=createHash('sha256').update(body).digest('hex');
  const sourceUrl=providedSourceUrl||'https://github.com/'+repo.full_name+'/blob/'+encodeURIComponent(ref)+'/'+path;
  const first=await db.query('SELECT fingerprint FROM project_plan_documents WHERE repository_id=$1 AND path=$2 ORDER BY version_id LIMIT 1',[repo.id,path]);
  const baseline=first.rows[0] ? await db.query('SELECT ordinal,title,scope FROM project_plan_items WHERE repository_id=$1 AND path=$2 AND fingerprint=$3',[repo.id,path,first.rows[0].fingerprint]):null;
  const originalTitles=new Map(baseline?.rows.filter(x=>x.scope==='original').map(x=>[x.ordinal,normalizedWorkTitle(x.title)]));
  const r=await db.query(`INSERT INTO project_plan_documents(repository_id,path,fingerprint,source_url,source_ref,title,body)
    VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING fingerprint`,
    [repo.id,path,fingerprint,sourceUrl,ref,title||body.match(/^#\s+(.+)$/m)?.[1]||path,body]);
  let changed=!!r.rowCount;
  for (const item of items) {
    const update=await db.query(`INSERT INTO project_plan_items(repository_id,path,fingerprint,ordinal,title,github_pr_number,github_pr_numbers,mapping_reason,scope)
    VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9) ON CONFLICT(repository_id,path,fingerprint,ordinal)
    DO UPDATE SET github_pr_number=excluded.github_pr_number,github_pr_numbers=excluded.github_pr_numbers,mapping_reason=excluded.mapping_reason
    WHERE project_plan_items.github_pr_numbers IS DISTINCT FROM excluded.github_pr_numbers OR project_plan_items.mapping_reason IS DISTINCT FROM excluded.mapping_reason`,
    [repo.id,path,fingerprint,item.ordinal,item.title,item.numbers[0]||null,JSON.stringify(item.numbers),item.reason,
      first.rows.length && originalTitles.get(item.ordinal)!==normalizedWorkTitle(item.title)?'addition':item.scope]);
    changed=changed||!!update.rowCount;
  }
  if (changed) await bumpRevision(db);
  return items.length;
}

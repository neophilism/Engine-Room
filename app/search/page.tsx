import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { readSession } from '../../lib/auth/database';
import { SESSION_COOKIE } from '../../lib/auth/security';
import { getDatabasePool } from '../../lib/server/database';
export const dynamic='force-dynamic';
export default async function SearchPage({searchParams}:{searchParams:Promise<{q?:string}>}){
  const q=(await searchParams).q?.trim().slice(0,200)||'';
  const user=await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  let rows:{title:string;url:string;kind:string}[]=[];
  let unavailable=false;
  if(q)try{
    rows=(await getDatabasePool().query<{title:string;url:string;kind:string}>(`SELECT DISTINCT * FROM (
      SELECT display_name AS title,'/projects/'||slug AS url,'Project' AS kind FROM projects WHERE display_name ILIKE $1 OR summary ILIKE $1
      UNION ALL SELECT title,html_url,'Pull request' FROM github_pull_requests WHERE title ILIKE $1
      UNION ALL SELECT d.title,'/projects/'||p.slug||'/plans','Plan' FROM project_plan_documents d
        JOIN project_repositories pr ON pr.repository_id=d.repository_id JOIN projects p ON p.id=pr.project_id WHERE d.title ILIKE $1
      UNION ALL SELECT r.release_key,'/releases','Release' FROM project_releases r WHERE $2 AND r.release_key ILIKE $1
      UNION ALL SELECT display_name,'/users','User' FROM engine_room_users WHERE $2 AND (display_name ILIKE $1 OR email ILIKE $1)
      ) results ORDER BY kind,title LIMIT 75`,['%'+q.replace(/[\\%_]/g,'\\$&')+'%',user?.role==='admin'])).rows;
  }catch{unavailable=true;}
  return <main className="content"><header className="hero"><p className="eyebrow">Portfolio search</p><h1>Search Engine Room</h1></header>
    <form action="/search" role="search"><label>Search <input type="search" name="q" defaultValue={q}/></label><button type="submit">Search</button></form>
    {unavailable?<p>Search is temporarily unavailable.</p>:q?<p>{rows.length} result{rows.length===1?'':'s'} for “{q}”</p>:<p>Search projects, PRs, plans, releases, and users.</p>}
    <ul className="search-results">{rows.map((row,index)=><li key={index}><span>{row.kind}</span>{row.url.startsWith('/')?<Link href={row.url}>{row.title}</Link>:<a href={row.url} target="_blank" rel="noopener noreferrer">{row.title}</a>}</li>)}</ul></main>;
}

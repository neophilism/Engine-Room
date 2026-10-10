import React from 'react';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getDatabasePool} from '../../../../lib/server/database';

export const dynamic='force-dynamic';
export default async function PlanHistoryPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params,db=getDatabasePool();
  const project=(await db.query('SELECT id,display_name FROM projects WHERE slug=$1',[slug])).rows[0];
  if(!project)notFound();
  const documents=(await db.query<{version_id:string;title:string;path:string;source_url:string;source_ref:string;body:string;imported_at:Date}>(
    `SELECT d.* FROM project_plan_documents d JOIN project_repositories pr ON pr.repository_id=d.repository_id
      WHERE pr.project_id=$1 ORDER BY d.version_id DESC`,[project.id])).rows;
  return <main className="content"><header className="hero"><p className="eyebrow">Plan source history</p><h1>{project.display_name}</h1>
    <p>Stored source revisions preserve original work and later additions.</p><Link href={'/projects/'+encodeURIComponent(slug)}>← Project dashboard</Link></header>
    {documents.length?documents.map((doc,index)=><details className="plan-history-version" key={doc.version_id} open={index===0}>
      <summary>{doc.title} · {doc.source_ref} · imported {doc.imported_at.toISOString()}</summary>
      {/^https:\/\//.test(doc.source_url)&&<p><a href={doc.source_url} target="_blank" rel="noopener noreferrer">Open source revision</a></p>}
      <pre>{doc.body}</pre></details>):<p>Plan source N/A. No source document has been imported.</p>}
  </main>;
}

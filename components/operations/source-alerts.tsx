import React from 'react';
import Link from 'next/link';
import type { LiveSnapshot } from '../../lib/domain/live-monitor';
import { BrassPanel } from '../machine';
export function SourceAlerts({snapshot,errors}:{snapshot:LiveSnapshot|null;errors:{full_name:string;last_error:string|null;last_success_at:string|null}[]}){
  return <BrassPanel title="Source and development alerts" eyebrow="Measured connection state">
    {!snapshot?<p>Source health unavailable.</p>:<>
      <p>{snapshot.state} · {snapshot.failedChecks} open PRs with failed checks · {snapshot.pendingEvents} pending webhook events</p>
      {snapshot.workerError&&<p>{snapshot.workerError}. Previous records are preserved.</p>}
      {snapshot.reconciliationEnabled===false&&<p>Repository reconciliation is paused in Settings.</p>}
      {snapshot.failedEvents>0&&<p>{snapshot.failedEvents} webhook deliveries are retrying automatically.</p>}
      {!snapshot.webhookConfigured&&<p>GitHub webhook connection has not been configured. Repository polling is the current update source.</p>}
      {!snapshot.authenticatedGitHub&&<p>GitHub read credentials are missing. Anonymous API limits require a {snapshot.pollingMinutes}-minute reconciliation interval.</p>}
      {!snapshot.renderConfigured&&<p>Render credentials are missing. Deployment records are dated snapshots.</p>}
      {snapshot.rateLimitResetAt&&Date.parse(snapshot.rateLimitResetAt)>Date.now()&&<p>GitHub requests will resume after {snapshot.rateLimitResetAt}.</p>}
    </>}
    <ul>{errors.map(row=><li key={row.full_name}>{row.full_name}: {row.last_error||'Initial synchronization pending'} · last success {row.last_success_at||'N/A'}</li>)}</ul>
    <Link href="/settings">Open synchronization controls</Link></BrassPanel>;
}

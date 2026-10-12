import React from 'react';
import type {RepositorySecurityStatus} from '../../lib/domain/security-status';
import {safeGitHubActivityUrl} from '../../lib/domain/development-activity';
export function SecurityStandardStatus({statuses=[]}:{statuses?:RepositorySecurityStatus[]}){
 const included=statuses.filter(s=>s.state!=='excluded');if(!included.length)return null;
 return <div className="project-security-status" aria-label="End-to-End Everywhere progress">{included.map(s=><div key={s.repository}>
 <strong>End-to-End Everywhere{included.length>1?' · '+s.repository:''}</strong>
 <div className="security-status-checkboxes">
 <label><input type="checkbox" checked={s.implemented} readOnly disabled/> Standard implemented</label>
 <label><input type="checkbox" checked={s.tested} readOnly disabled/> Required testing passed</label>
 <label><input type="checkbox" checked={s.independentReview} readOnly disabled/> Independent expert review</label>
 </div><small>{s.reasons[0]||'Recorded stages complete'} · {safeGitHubActivityUrl(s.sourceUrl)&&<a href={s.sourceUrl} target="_blank" rel="noopener noreferrer">Repository evidence</a>} · Development tracking; certification is separate.</small>
 </div>)}</div>;
}

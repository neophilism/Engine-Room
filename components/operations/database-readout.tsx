import React from 'react';
import type {DatabaseReadout} from '../../lib/server/database-readout';
import {BrassPanel} from '../machine';
export function DatabaseSourceReadout({data}:{data:DatabaseReadout}){
  return <BrassPanel title="Engine Room database" eyebrow="PostgreSQL connection probe">
    {data.state==='observed'?<><p>Database query succeeded · observed {data.checkedAt}</p><dl className="project-at-a-glance">
      <div><dt>Database</dt><dd>{data.database}</dd></div><div><dt>PostgreSQL</dt><dd>{data.version}</dd></div>
      <div><dt>Stored data</dt><dd>{(data.sizeBytes!/1024/1024).toFixed(1)} MiB</dd></div><div><dt>Query probe</dt><dd>{data.probeMs} ms</dd></div></dl>
      <p>This probe measures the dashboard database connection. Other project databases require their own feeds.</p></>:<p>{data.state==='unconfigured'?'Database connection N/A.':'Database probe unavailable.'} · checked {data.checkedAt}</p>}
  </BrassPanel>;
}

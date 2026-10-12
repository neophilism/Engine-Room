import React from 'react';
import {type ProjectUpdate,projectUpdateLabels} from '../../lib/domain/project-update';
import {safeGitHubActivityUrl} from '../../lib/domain/development-activity';
export function ProjectLastUpdate({update}:{update?:ProjectUpdate}) {
  if(!update)return <p className="project-last-update">Last update: Not yet observed from GitHub</p>;
  const url=safeGitHubActivityUrl(update.url);
  const date=new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'medium',timeZone:'America/New_York'}).format(new Date(update.at));
  return <p className="project-last-update" title={update.title+' · '+update.repository+' · Observed '+update.observedAt}>
    Last update: <time dateTime={update.at}>{date} ET</time> · {url
      ? <a href={url} target="_blank" rel="noopener noreferrer">{projectUpdateLabels[update.kind]}</a>
      : projectUpdateLabels[update.kind]}
  </p>;
}

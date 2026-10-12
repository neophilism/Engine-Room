export type ProjectUpdate = {
  kind: 'pr-opened'|'pr-merged'|'pr-closed'|'pr-updated'|'pr-pushed'|'direct-commit'|'repository-push';
  at: string;
  title: string;
  url: string;
  repository: string;
  observedAt: string;
};
export const projectUpdateLabels: Record<ProjectUpdate['kind'],string> = {
  'pr-opened':'New PR opened', 'pr-merged':'PR merged', 'pr-closed':'PR closed',
  'pr-updated':'PR updated', 'pr-pushed':'New commit pushed to PR',
  'direct-commit':'Direct commit / file edit', 'repository-push':'Repository push'
};

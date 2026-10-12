# Production GitHub synchronization acceptance and access runbook

Engine Room never needs a new Engine Room pull request when another repository
merges a change. Each owning repository publishes approved `registry/prs.json` or
`registry/roadmap.json` for work-unit definitions and explicit associations. Current pull-request status
comes from GitHub's API and is materialized into the Engine Room database.

## Production credential

Render's existing `GITHUB_READ_TOKEN` must be a GitHub token that can read
**all monitored private repositories**, not merely list public repositories.
For a fine-grained personal access token, set the resource owner to the
`neophilism` account, select all intended repositories (or all repositories),
and grant read-only **Contents** and **Pull requests** permissions, with
**Metadata** read access. A classic PAT needs `repo` scope for private
repositories. Other account policies and approvals may apply. Update the
existing Render environment variable; **never commit, log, or paste the value
into a PR, a dashboard, or chat**.

An authenticated `GET /user` returning HTTP 200 does *not* certify private
repository access. Use `lib/sync/github-access-probe.mjs`: both the metadata
and pulls endpoints for the known-private Engine-Room and Music-Analyzer
repositories must return HTTP 200. The logged diagnostic includes only HTTP
codes and a reason classification, never secrets or response bodies.

## Refresh invariants

1. The header **Refresh** control invokes authenticated
   `POST /api/admin/reconcile` in manual mode. It fetches actual PRs across
   all eligible repositories and only then imports plan documents.
2. The display silently refreshes saved dashboard data every 30 seconds.
   This is not a second GitHub sync button.
3. Source plans prefer each repository's current `registry/prs.json`, then
   a current `registry/roadmap.json` if the first file is not present.
   Historical bundled snapshots may bootstrap a previously unmeasured
   repository, but may **never overwrite an already persisted source plan**
   during an auth, transport, or permission outage.
4. A failed GitHub PR request retains its last good data, records a failure,
   and must not advance the repository's last successful sync timestamp.
5. For each repository the diagnostics show the last successful PR sync,
   actual stored merged PR count, and whether its plan was imported live or
   from historical fallback. Partial refreshes must not appear successful.

## Acceptance checklist

- Merge a test PR into a public monitored repository, click Refresh, and
  confirm the new merged PR count and latest activity **without an Engine Room
  code or snapshot PR**.
- Repeat on a private monitored repository after the Render credential has
  been verified to read its pull requests. Both repositories must advance.
- Force a GitHub registry file-fetch outage: the last imported roadmap stays
  intact and the refresh reports an error; it must not silently downgrade.
- Force an API 403/404 and confirm per-repository freshness and errors remain
  visible. Re-authorize the credential and confirm the next refresh heals them.
- Check The Garden and The Cornerstone against their live GitHub pull requests.
  Distinguish all merged GitHub PRs from mapped, completed planned units.

## Hosting caveat

The current background worker runs as a child of the Render web process.
On instances that sleep or scale to zero it cannot synchronize while the
process is suspended. A user-initiated Refresh works after the service wakes;
continuous unattended updates require an always-running worker or equivalent
external scheduler. Do not claim 24/7 background monitoring on a sleeping
instance.

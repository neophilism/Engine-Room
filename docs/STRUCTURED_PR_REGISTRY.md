# Structured PR Registry (v1)

Engine Room counts planned work and PR evidence from JSON, not from free-form
Markdown. Keep every original development-plan document unchanged.

## Canonical per-repository file: registry/prs.json

The full schema is one JSON object per repository, with these fields:

- schemaVersion: 1
- repository: "neophilism/Music-Analyzer"
- roadmapVersion: positive integer; bump when approved work scope changes
- planVerified: boolean
- plannedPrCount: exact count of units
- observedAt: ISO 8601 UTC time when PR data was actually retrieved
- units: ordered array of objects with id, title, origin ("original" or
  "addition"), and prs (array of explicitly associated GitHub PR numbers).
- pullRequests: actual GitHub PR records (id, number, title, url, state,
  draft, createdAt, updatedAt, closedAt, mergedAt, headSha, baseRef,
  mergeCommitSha). Use real GitHub identifiers and timestamps.

Example work units:
```json
{
  "schemaVersion": 1,
  "repository": "neophilism/Music-Analyzer",
  "roadmapVersion": 2,
  "planVerified": true,
  "plannedPrCount": 2,
  "observedAt": "2026-10-11T17:38:28.617Z",
  "units": [
    {"id": "MVA-01", "title": "Architecture", "origin": "original", "prs": [1]},
    {"id": "MVA-02", "title": "Approved future work", "origin": "addition", "prs": []}
  ],
  "pullRequests": []
}
```

In a real published file, PR 1 must also have a real observed pullRequests
record before it is counted green or yellow. Blank records never qualify.

## Progress rules

The denominator is the length of units. New approved items increase it.
Green means every PR explicitly linked to a unit has a confirmed GitHub
mergedAt timestamp. Yellow means the unmerged unit has a currently open,
explicitly mapped PR. Everything else is empty. A PR closed without merging
does not count green; an unrelated open PR does not count yellow.

Never infer an arbitrary PR number from a work-unit ordinal. Exact ID matches
in a PR title may be reviewed and committed explicitly. Unmapped planned
units must remain in the denominator. Unverified plans have planVerified:false,
plannedPrCount:0 and units:[] and appear as N/A.

## Private-source fallback

Engine Room bundles repository-specific copies at
registry/pr-snapshots/<repository>.json. A private repository may return HTTP
404 to Render without a token with the correct private-repository access.
In that case Engine Room can import the previously verified structured
snapshot. Its observedAt remains the snapshot observation time; this does
not mark the GitHub live API as refreshed.

Never overwrite newer webhook/API observations with an older JSON snapshot.
Whenever a newly approved unit or PR is added, update the source registry
and regenerate the bundled snapshot; preserve previous documentation.

To automate truly live private PR status, configure a Render secret named
GITHUB_READ_TOKEN with access to each selected private repository's Contents
and Pull Requests, or install a GitHub App with equivalent scope. Never
store credentials in JSON or in any GitHub commit.

## Acceptance

Run tests, deploy the merged Engine Room commit, inspect the PR import logs,
and validate Neon records, source timestamps, and dashboard counts. Music
Analyzer must show 16/16 green, zero yellow. Clicking the freshness control
must separately disclose structured snapshot imports and actual GitHub API
refreshes. Never call the API live when only a bundled snapshot was loaded.

## Runtime authority and Refresh behavior

The **owning repository** supplies the approved planned-work units and explicit
PR links in `registry/prs.json`. **GitHub's live Pull Requests API is the
authority on open and merged status**. The `pullRequests` array inside a
source JSON file is a historical observation, never a requirement to edit JSON
after every merge. A change to one repository's code or plan must **never**
require an Engine Room PR solely to update a bundled snapshot.

Clicking **Refresh** in the header checks **all registered repositories** for
current GitHub PR status, then imports the owners' JSON plan files and derives
the resulting completion fraction. The secondary **Reload display** control
only reloads previously stored server data and is intentionally labeled
differently. The startup worker performs a bounded refresh on deployment;
subsequent scheduled reconciliations are incremental. Optional review/check
API failures must not block PR timestamps or counts.

Previously unmapped units can acquire a database-derived PR reference when
one real GitHub PR title starts with the unit's **exact stable ID**, e.g.
`GDN-040: Content revision`. This does not change the owner-authored
roadmap, its denominator, or stored GitHub PR titles. Similar wording,
coincidental numeric ordinals, and ambiguous IDs never count as verified
completion. All unmapped-but-merged PRs remain visible in the **total merged
GitHub PRs** readout instead of being falsely counted as planned items.

A historical `registry/pr-snapshots/*.json` is strictly a degraded-read
fallback for source-access failures, **not a second source of truth**. Its
original observed timestamp remains unchanged. The portfolio reports live
source, fallback, and per-repository GitHub sync errors separately.

Never manually update those snapshots to make a progress bar appear fuller.
Repair source connectivity or record approved mappings in the **source**
repository. PR-derived statuses always come from GitHub.

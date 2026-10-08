# GitHub repository and pull-request reconciliation

PR 11 adds full-state reconciliation alongside the PR 10 webhook inbox.

## Why both mechanisms exist

Webhooks provide low-latency updates but delivery can be delayed, retried, or missed. Reconciliation periodically re-reads the authoritative GitHub state so Engine Room converges even after transient webhook or deployment failures.

## Reconciliation flow

`reconcileGitHubInstallation`:

1. discovers every repository available to the GitHub App installation;
2. reads all pull requests, including open and closed records;
3. normalizes provider payloads;
4. upserts repositories and pull requests inside one database transaction;
5. stamps every synchronized pull request with `last_synced_at`.

The function is scheduler-agnostic. Production scheduling is wired during the automation/deployment milestones; any trusted scheduler can invoke the reconciliation service at the desired interval.

## Data behavior

Repository identity is keyed by immutable GitHub repository ID. Pull request identity is keyed by immutable GitHub pull-request ID while `repository_id + number` remains unique for human navigation. Rename, visibility, archive, draft, state, and merge changes all reconcile without creating duplicates.

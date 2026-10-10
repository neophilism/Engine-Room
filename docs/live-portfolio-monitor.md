# Portfolio monitoring and source evidence

The dashboard keeps repository activity separate from original roadmap completion and deployment state. Every registered repository exposes open PRs, drafts, reported checks, conflicts, review counts, and recent merges, even when its approved original plan has not been found.

## Plans and completion

Repository source documents are versioned in PostgreSQL. Structured roadmaps can declare original/addition scope and multiple PRs per work item. Markdown imports use explicit reviewed bindings or one unique normalized work-title match. Roadmap ordinals are never assumed to be GitHub PR numbers. The original Engine Room mapping continues to use its 40 explicit references, including original units mapped to PRs above #40.

Original units survive source revisions. Changed scope and new units are additions; historical additions remain visible after later edits. Private planning documents belong in the database, not this public repository. Proposed or unapproved documents do not establish an approved original denominator.

A unit is verified merged only when every mapped PR has landed on its repository's default branch. Intermediate merges can qualify when GitHub commit ancestry proves inclusion in the observed default-branch head. Missing PRs or unverifiable release inclusion show N/A. New default-branch heads invalidate older ancestry evidence until reconciliation checks it again. Merged work remains separate from deployment and operational readiness.

The aggregate gauge measures verified mappings, and explicitly reports incomplete portfolio coverage. It is not the percentage of the whole portfolio finished. Original work uses green; additions use blue. Stored plan history is available from each project dashboard.

## Durable updates

`POST /api/github/webhook` validates the signature and durably stores a unique delivery before returning 202. The built-in worker locks inbox rows with `FOR UPDATE SKIP LOCKED`, applies an event and acknowledges it in one transaction. Failed events roll back and retry with bounded exponential backoff. PR and check updates reject older observations; checks are tied to the current PR head, and latest reruns supersede older failures.

Reconciliation discovers authorized owner repositories, reads all pages, and uses per-repository checkpoints and expiring leases. A failed repository retains its previous records and does not stop other repositories. Conditional requests reuse ETags. Provider rate limits persist a resume time instead of repeatedly issuing requests. Authenticated reads use a minimum 15-minute interval; anonymous reads use a minimum two-hour interval. Controls can pause reconciliation. The inbox remains available while reconciliation is paused.

The existing web service starts the worker and restarts it if it exits. No additional Render service is required. A sleeping or stopped web service cannot run the worker; the dashboard shows its measured worker and source freshness when it reconnects. An always-running deployment or an independently authorized scheduler is required for updates while the service sleeps.

## Browser behavior

Authenticated `/api/live/events` streams measured source state and revision IDs. Browsers use revision changes to refresh server data while preserving filters, expanded rows, and local monitor preferences. Polling is the fallback. Failed push and polling reads show Disconnected; expired sessions close the stream and offer sign-in. The header's Live, Catching up, Stale, and Disconnected states derive from worker heartbeat, reconciliation freshness, outstanding events, and source errors.

Search resolves projects, PRs, source plans, and administrator-visible release/user results. Notifications open source/development alerts. Administrator sessions can operate synchronization controls without a second bearer token; writes retain origin checks, revision checks, and actor audit records. Scheduler bearer authentication remains available on the reconciliation endpoint.

## Integration boundaries

Render API reads refresh the existing deployment inventory when `RENDER_API_KEY` is configured. Without a successful read, records remain dated snapshots. Public HTTP probes report only website responses. Database probes measure the dashboard's actual PostgreSQL connection and size; they do not imply health for other project databases. Users & Access reads actual Engine Room account roles and disabled states alongside signed external identity feeds, leaving unobserved MFA/activity values unknown. Operations, finance, and external users retain their signed scoped telemetry adapters and N/A states until feeds deliver observations.

Server credentials: `DATABASE_URL`; optionally `GITHUB_READ_TOKEN`, or `GITHUB_APP_ID` + `GITHUB_APP_PRIVATE_KEY` + `GITHUB_INSTALLATION_ID`; `GITHUB_WEBHOOK_SECRET`; `RENDER_API_KEY`; and project-scoped telemetry keys. Credentials are never shipped to the browser. Select the authorized existing Render workspace/service before configuring them.

## Release verification

Run typecheck, lint, migration discovery, explicit roadmap/polling policy checks, unit tests, PostgreSQL integration tests, the production build, and browser acceptance. Browser acceptance covers signed deliveries, automatic refresh with retained filters/expansion, search/history/notifications, administrator controls and audit, lost sources, and session expiration. Production acceptance still requires deployment of the reviewed commit, credentials in the authorized workspace, a real signed delivery, observed source freshness, and confirmation that the existing login works.

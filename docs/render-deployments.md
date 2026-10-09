# Verified Render deployment readouts

The portfolio home now displays 13 service records verified directly from the connected Render workspace on October 8, 2026, with their repo mapping, public URL, last known status, commit SHA and provider timestamp. Twelve latest deployments were `live`; the old Civic Registry preview build was `build_failed` while `civic-registry-preview-v2` succeeded.

These are real source snapshots, not synthetic projects or application-health claims. The visible `source` label distinguishes dated snapshots from fresh provider reads. These snapshots intentionally do not expose private configuration, environment variables, metrics or service credentials.

To enable automatic provider refresh, set `RENDER_API_KEY` only in the Engine Room service's Render secret environment. Engine Room then queries the official Render REST endpoint `GET /v1/services/{serviceId}/deploys?limit=1` server-side, caching for five minutes. The API key is never bundled for the browser, and failed/invalid provider reads fall back to the visibly dated original snapshot.

The Render API refresh is independent of GitHub repository/PR synchronization. A successful Render deployment does not prove application reachability, uptime, release readiness, database health or security acceptance.

## Public GitHub ingestion without a paid cron service

With `ENGINE_ROOM_PUBLIC_GITHUB_SYNC=1`, the deployed web process starts a best-effort public-repository import 15 seconds after startup and again every two hours anonymously, or every 15 minutes with `GITHUB_READ_TOKEN`, while the instance remains awake. This mode costs no dedicated scheduler instance, but may pause during free-tier sleep, does not include private repositories, and has GitHub's low anonymous rate limit unless `GITHUB_READ_TOKEN` is supplied. Configure GitHub App events and an authenticated scheduler for faster and more reliable updates. The source script never inserts guessed approved roadmap progress.

Public GitHub import now defaults on when NODE_ENV=production unless explicitly disabled with ENGINE_ROOM_PUBLIC_GITHUB_SYNC=0. Service wake-ups may restart the best-effort job, and this does not replace an externally scheduled ingestion process.

## Public endpoint observations (10-minute refresh)

The Dashboard's public-site readouts use `GET /api/public-sites` to make anonymous HEAD requests to the 13 explicitly listed `https://*.onrender.com` websites. The allowlist is fixed in source code, preventing arbitrary destination probing. Observations are cached in-process for ten minutes and the dashboard refreshes while open. The check reports the actual HTTP response code and timestamp or `no response`, not `healthy`, `running`, or `offline`. A Render free-tier instance may take longer than the timeout to wake, and HTTP success alone is not end-to-end application acceptance evidence. Neither database credentials nor Render API keys are required for these public HTTP checks.

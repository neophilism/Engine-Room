# Verified Render deployment readouts

The portfolio home now displays 13 service records verified directly from the connected Render workspace on October 8, 2026, with their repo mapping, public URL, last known status, commit SHA and provider timestamp. Twelve latest deployments were `live`; the old Civic Registry preview build was `build_failed` while `civic-registry-preview-v2` succeeded.

These are real source snapshots, not synthetic projects or application-health claims. The visible `source` label distinguishes dated snapshots from fresh provider reads. These snapshots intentionally do not expose private configuration, environment variables, metrics or service credentials.

To enable automatic provider refresh, set `RENDER_API_KEY` only in the Engine Room service's Render secret environment. Engine Room then queries the official Render REST endpoint `GET /v1/services/{serviceId}/deploys?limit=1` server-side, caching for five minutes. The API key is never bundled for the browser, and failed/invalid provider reads fall back to the visibly dated original snapshot.

The Render API refresh is independent of GitHub repository/PR synchronization. A successful Render deployment does not prove application reachability, uptime, release readiness, database health or security acceptance.

## Public GitHub ingestion without a paid cron service

With `ENGINE_ROOM_PUBLIC_GITHUB_SYNC=1`, the deployed web process starts a best-effort public-repository import 15 seconds after startup and again every 12 hours while the instance remains awake. This mode costs no dedicated scheduler instance, but may pause during free-tier sleep, does not include private repositories, and has GitHub's low anonymous rate limit unless `GITHUB_READ_TOKEN` is supplied. Configure GitHub App events and an authenticated scheduler for faster and more reliable updates. The source script never inserts guessed approved roadmap progress.

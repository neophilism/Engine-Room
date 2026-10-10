# Worker presence — separately measured from website availability

This PR adds an explicitly separate `worker-heartbeat-percent` operation metric for signed worker-presence observations. It does **not** redefine the existing `availability-percent` website availability metric.

Engine Room's `POST /api/telemetry` accepts signed scoped `engine-room-v1` deliveries as documented in `docs/telemetry.md`. A source key should have only the `metric` capability, be scoped to the verified Music Video Wizard project UUID and `production` environment, and identify a dedicated worker source (for example `music-video-wizard-worker`).

A `worker-heartbeat-percent` reading of 100 means a recent durable heartbeat was observed at that instant. A 0 means the sender's check did not find one. The observation expires under the standard 15-minute telemetry freshness rule. An absent sender / missing credential / stale observation must be rendered unknown, not healthy. There is no promise that a worker process can push a failure event after the process itself stops.

**Do not infer nominal project health from a worker heartbeat alone.** `assessProjectOperations` continues to require the separate fresh website availability, HTTP error-rate and P95 latency metrics before it claims nominal status. Worker presence is an additional independent evidence column.

The additive migration `0018_worker_presence_signal.sql` allows the new metric in the existing operation-samples database check constraint. Apply migrations before enabling the producer. The matching Music Video Wizard producer is implemented separately in PR #56: deploy Engine Room's migration and server version **first**, then configure and deploy the sender worker. Until then sender credentials must stay disabled to avoid rejected telemetry.

Tests verify percent bounds and that a 100% worker pulse without HTTP signals cannot make a project nominal.

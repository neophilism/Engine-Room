# Signed telemetry ingestion

`POST /api/telemetry` accepts at most 64 KiB and 100 records. It verifies HMAC-SHA256 over the exact request bytes prefixed by `<timestamp>.`. The timestamp is Unix milliseconds and must be within five minutes. Send `Content-Type: application/json`, `X-Engine-Room-Key`, `X-Engine-Room-Timestamp`, and `X-Engine-Room-Signature: sha256=<hex>`. Use HTTPS in production.

Configure `ENGINE_ROOM_TELEMETRY_KEYS` as a JSON array in the secret manager. Each entry requires id, a random secret of at least 32 bytes, projectId (registered project UUID), environment, source, adapter, and capabilities. Rotate by installing a new key ID, migrating the sender, then removing the old ID. Removing a key revokes it. Never commit keys or print them in logs.

Supported adapters:

- `engine-room-v1`: `{ "version": 1, "deliveryId": "unique-source-delivery", "records": [...] }`.
- `metrics-json-v1`: `{ "version": 1, "deliveryId": "unique-source-delivery", "observedAt": "<UTC ISO timestamp>", "samples": [{ "id": "unique-observation", "metric": "cpu", "value": 20 }] }`. Aliases are availability (%), latencyP95Ms (ms), requestsPerMinute, errorRate (%), cpu (%), and memory (%). Values are measured observations, not inferred health.

Canonical record examples:

```json
{
  "version": 1,
  "deliveryId": "monitor-100",
  "records": [
    { "kind": "metric", "externalId": "cpu-100", "metric": "cpu-percent", "value": 20, "observedAt": "2026-10-08T00:00:00Z" },
    { "kind": "incident", "externalId": "outage-1", "title": "API unavailable", "severity": "critical", "occurredAt": "2026-10-08T00:00:00Z" },
    { "kind": "incident-event", "externalId": "outage-1", "event": { "key": "ack-1", "from": "detected", "to": "acknowledged", "occurredAt": "2026-10-08T00:01:00Z", "note": "On-call investigating" } }
  ]
}
```

Capabilities match record kinds: metric, incident, incident-event, release, release-event. Release creation uses key and commitSha; release-event uses key and event (event key, from, to, occurredAt, optional evidenceUrl). Approval, live, and rollback transitions require both an HTTPS evidence URL and that target state in the credential's optional `evidenceTransitions` list. Grant these only to trusted approval/deployment authorities. A source cannot attest every readiness gate by moving its pipeline to live.

Project, environment, source and actor are derived from credentials. Payload-supplied scope or actor fields are rejected. Incident and release event targets are looked up inside that source scope. Release identities now include source, preserving internal server-created releases under source `internal`.

The entire delivery, receipt and domain writes use one transaction. Exact delivery replay returns 200 without rewriting data; accepted batches return 202. Reusing a delivery identity with a different byte-level payload hash returns 409. Domain conflicts also roll back the entire batch, including the receipt, allowing a corrected retry. Validation failures return 400, scope violations 403, bad signatures 401, oversize payloads 413, and missing infrastructure 503. Errors do not return secrets, SQL, or request contents.

The Operations page shows last accepted delivery freshness per project/environment/source. Recent ingestion and healthy operations are separate measures. Add adapters by producing the same normalized record union and enforcing scope before persistence. Production ingress should also apply sender-specific request limits and connection timeouts.

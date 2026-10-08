# GitHub webhook ingestion

PR 10 adds the durable webhook inbox that drives near-real-time synchronization.

## Endpoint

`POST /api/github/webhook`

Every request must include:

- `X-GitHub-Event`
- `X-GitHub-Delivery`
- `X-Hub-Signature-256`

The body is authenticated with an HMAC-SHA256 over the exact request bytes using `GITHUB_WEBHOOK_SECRET`. Comparison uses constant-time byte comparison.

## Delivery semantics

Validated deliveries are inserted into `github_webhook_deliveries` before downstream processing. The GitHub delivery UUID is unique, so retries are idempotent. Duplicate deliveries return success without inserting a second record.

The inbox deliberately stores the original JSON payload and event name. PR 11 consumes this durable inbox to synchronize repository and pull-request state and also adds periodic reconciliation so missed webhooks do not create permanent drift.

## Failure behavior

- missing secret: 503
- missing required headers: 400
- bad signature: 401
- malformed JSON: 400
- accepted new delivery: 202
- duplicate valid delivery: 200

No unsigned payload reaches persistence.

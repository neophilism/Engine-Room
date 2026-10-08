# Alerts and incident response

PR 31 adds project/environment/source-scoped incident records and an append-only response ledger. Source alert identities are immutable. Identical deliveries return the existing incident; a reused identity with different content is rejected.

The response states are detected, acknowledged, investigating, mitigated, and resolved. A resolved incident can explicitly reopen. Every transition requires its current-state precondition, actor, timestamp, event identity, and response note. Row locks serialize concurrent responses, stale source times are rejected, and identical events can be retried without moving the state twice. A failed operation rolls back both the event and incident state.

`recordIncident` and `transitionIncident` are trusted server operations. The dashboard presents recorded response stages, source evidence, state/severity filters, and open/critical counts. Unconfigured or unavailable feeds do not establish a healthy incident state. Ingestion authentication is introduced in PR 32; these functions are not anonymous write routes.

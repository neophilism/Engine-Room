# Operations and performance

The Operations dashboard displays latest availability, P95 latency, requests/minute, error rate, CPU, and memory observations by project and environment. It never substitutes zero for a missing measurement. Nominal status requires all three fresh availability/error/latency signals to meet the displayed thresholds; a current threshold violation is degraded. Missing, stale, or future observations cannot establish nominal status.

`recordOperationSamples` validates finite nonnegative values, percentage ranges, environment/source identity, and timestamps. It transactionally upserts provider identities, allowing retries without duplicate samples. The database records source and observation/receipt times. Trusted server imports are used; no public write endpoint is exposed.

Default thresholds are availability 99.9%, error rate 1%, P95 latency 1000 ms, and freshness 15 minutes. The domain assessment accepts custom thresholds. Production monitoring providers and generic adapters are connected by subsequent telemetry/automation milestones. This dashboard shows measurement state, not production acceptance evidence.

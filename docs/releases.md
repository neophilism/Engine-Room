# Releases and pipeline machine

The Releases dashboard shows immutable release commit/environment targets and recorded pipeline state, with responsive machines for build/validation, approval, rollout, and production. Live state is never inferred from roadmap percentage or a successful build alone.

Trusted server methods create releases and apply explicit transitions. Row locks protect state preconditions; immutable provider event identities make identical retries no-ops, while changed replay content fails. Transitions cannot skip build/validation/approval. Approval, live, and rollback events need actor, time, and source evidence. Failed releases may restart a fresh build, while rollback/cancelled releases are terminal.

The event ledger records transitions; it does not execute deployments or authenticate evidence contents. The separate release-readiness assessment still requires current acceptance evidence. Production automation/providers publish events through the later authenticated ingestion framework.

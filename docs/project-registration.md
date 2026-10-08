# Automatic project registration

PR 16 completes the GitHub/roadmap engine by turning an approved repository manifest into durable Engine Room portfolio state.

## Registration transaction

`registerApprovedProject` performs one atomic transaction:

1. validate that the manifest is approved and names the discovered repository exactly;
2. upsert the normalized repository by immutable GitHub repository ID;
3. upsert the project by stable slug;
4. establish the repository as the project's primary repository;
5. create or reuse the immutable approved development-plan version;
6. create its milestones;
7. for a new plan version, seed exactly the approved number of planned PR roadmap units.

If any step fails, the transaction rolls back.

## No guessed GitHub mappings

Count-only manifests do not contain a trustworthy GitHub PR mapping. Registration therefore creates deterministic roadmap units (`Roadmap PR 1`, `Roadmap PR 2`, etc.) with their repository and milestone membership, but leaves `github_pr_number` null.

That is deliberate: Engine Room must not inflate progress by guessing that roadmap ordinal N necessarily equals GitHub PR #N. Once an explicit mapping is available, PR 14's completion engine uses synchronized GitHub merge state to calculate the numerator.

## Idempotency

Repository/project upserts are safe to repeat. Re-importing an unchanged approved manifest reuses the existing plan fingerprint and does not seed duplicate roadmap units. A materially changed approval creates a new immutable plan version and a fresh set of roadmap units.

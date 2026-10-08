# Planned-PR completion calculation

PR 14 defines the roadmap numerator.

## Rule

A roadmap unit counts as complete only when:

1. it exists in the approved development plan;
2. it is mapped to a GitHub pull-request number; and
3. synchronized GitHub state contains a non-null merge timestamp for that PR.

Open PRs become `in-progress`. Closed-but-unmerged PRs do not count as completed and return to `planned` for roadmap purposes. Unmapped or missing GitHub PRs also remain planned.

## Denominator

The denominator is never inferred from GitHub activity. It remains the immutable `planned_pr_total` captured from the approved manifest version.

## Ambiguity

PR numbers are repository-local. If reconciliation input contains the same PR number for more than one repository, the calculation fails rather than guessing. Repository-scoped plan mapping is completed by the project registration/import path.

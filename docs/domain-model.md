# Portfolio domain model

PR 3 makes the roadmap and portfolio model explicit. The dashboard must never infer completion from arbitrary GitHub activity alone.

## Core entities

### Repository

A repository is a connected Git repository. GitHub is the initial provider. A repository stores the stable GitHub repository ID in addition to the owner/name pair so renames can be reconciled later.

### Project

A project is the portfolio-level thing Engine Room tracks. Most current projects have one repository, but the model deliberately supports supporting repositories so a larger product can grow without redesigning the schema.

A project may have exactly one repository marked `primary` and any number marked `supporting`.

### Development plan

A development plan is the approved roadmap definition for a project. It has:

- a version number;
- a lifecycle status;
- an explicit `plannedPrTotal`;
- an approval timestamp when approved;
- ordered milestones;
- ordered planned PR records.

The explicit total is intentional. Engine Room validates that the imported planned PR records match the approved denominator rather than silently changing the denominator if an import is incomplete.

### Milestone

A milestone groups planned PRs into roadmap stages. Each milestone has its own expected planned PR total. This enables the later light-bulb milestone visualization without deriving stage boundaries from display text.

### Planned PR

A planned PR is one unit of roadmap progress.

Only a **planned PR in merged status** contributes to the main roadmap numerator.

The following do not advance roadmap completion unless they are represented by an approved planned PR record:

- Dependabot PRs;
- unplanned bug fixes;
- maintenance PRs;
- draft PRs;
- closed but unmerged PRs;
- unrelated repository activity.

A skipped planned PR remains in the denominator until an approved plan amendment changes the roadmap. This prevents progress from increasing merely because work was abandoned.

## Progress equation

For an approved development plan:

```text
completed = count(planned PRs where status = merged)
planned   = approved development plan plannedPrTotal
progress  = completed / planned
```

Portfolio-level progress later uses the same principle by summing completed and planned units across projects rather than averaging project percentages.

## Integrity rules

The TypeScript domain validator and PostgreSQL constraints protect the same core invariants:

- plan and milestone ordinals are unique within their parent;
- planned PR ordinals are unique within a plan;
- a planned PR cannot point to a milestone from a different plan;
- merged planned PRs require a merge timestamp;
- GitHub PR numbers, once linked, are unique within a repository;
- one project can have at most one primary repository;
- imported PR counts must match the approved plan and milestone totals before progress is calculated.

## Future roadmap boundaries

This PR defines the domain and persistence shape. Later milestones add behavior on top of it:

- PR 9–11: GitHub connection and synchronization;
- PR 12: `.exechub/project.yml` parser;
- PR 13: full versioned plan approval/supersession workflow;
- PR 14: persisted completion calculation engine;
- PR 15: lifecycle and milestone-state calculation;
- PR 16: automatic project registration.

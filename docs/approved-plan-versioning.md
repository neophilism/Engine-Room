# Versioned approved development plans

PR 13 turns an approved roadmap into durable historical evidence.

## Rules

- Only a manifest with `roadmap.approved: true` can create an approved plan version.
- A canonical SHA-256 fingerprint identifies the exact normalized manifest content.
- Re-importing the same approved manifest is idempotent and does not create another version.
- A material manifest change creates the next monotonically increasing version.
- At most one plan per project can have current `approved` status.
- The previous current plan becomes `superseded`; its approved identity remains immutable.
- The normalized manifest, repository coordinate, source ref, fingerprint, denominator, and approval timestamp are preserved.

These rules prevent progress percentages from silently changing when a plan file is edited later. New approvals create new history instead.

## Database enforcement

The database enforces one current approved plan and rejects mutation of identity-bearing fields after a plan reaches `approved` or `superseded`. Status may transition from approved to superseded without rewriting the historical approval.

## Current progress when approved scope expands

Historical approved versions retain their original SHA-256 provenance and
denominator. The **current** progress widget uses the latest documented full
approved plan, including explicit additions; it must shrink when planned
units are added. Merging work makes its slice green. A written but unmerged PR
makes its slice yellow, independent of how old or new that PR is. Neither
color depends on the version of the plan that introduced the work. See
[portfolio-progress.md](portfolio-progress.md).

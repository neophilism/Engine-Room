# Feature tracking

Features are explicit records scoped to an approved development-plan version, linked to one or more planned PR ordinals. `registerProjectFeatures(planId, definitions)` validates and transactionally upserts definitions; repeated registration does not create duplicates. Invalid ordinals roll back the batch, and composite foreign keys prevent cross-plan links. Registration is a server-side operation with no unauthenticated HTTP write endpoint.

Implemented means all linked approved work has real synchronized GitHub merge timestamps. Partial merges or open linked work are underway. No links or no activity remain remaining. No feature is fabricated from a PR title, and an unlinked feature is never treated as implemented.

Current approved-plan features appear in project dashboards, Home's Features accordion, and portfolio search. Superseded-plan features are excluded. Features do not add to the roadmap denominator or establish production readiness.

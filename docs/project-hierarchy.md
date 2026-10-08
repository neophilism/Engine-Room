# Engine / implementation hierarchy

In every project-list presentation, place the projects that implement a shared
engine directly after that parent engine. Indent only the **project name text**
for implementations; keep progress tubes, counts, percentages, health columns,
and other numeric cells aligned with other rows.

The relationship table is centralized in `lib/domain/project-hierarchy.ts`.
Mappings are explicit by normalized GitHub repository name, not inferred from
text similarity, PR counts, or broad keyword matching.

Relationships currently covered:
- Civic Registry Transparency Engine -> Smart Cities Surveillance Registry
- Compliance Authorization Immutable Audit Engine -> Algorithmic Accountability; Federal Encryption Compliance
- Live Competition Engine -> MMS; Rap Battle Platform
- Secure Intake Case Workflow Engine -> National Secure Ideas Submission
- End-to-End Everywhere Security Architecture Standard -> End-to-End Everywhere Suite

When a user filters out the parent engine, a remaining child is displayed
without indentation, rather than bringing a hidden parent back into results.
All sort modes retain parent-child adjacency. Other projects remain standalone.
No hierarchy mapping alters project status, repository synchronization,
approved roadmaps, progress calculations, or financial totals.

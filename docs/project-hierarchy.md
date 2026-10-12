# Engine / implementation hierarchy

In every project-list presentation, place the projects that implement a shared
engine directly after that parent engine. Nest and indent the implementation
cards by their visible ancestor depth; grandchildren receive a second indent.
The full card, including its progress and source readouts, follows that nesting.

The relationship table is centralized in `lib/domain/project-hierarchy.ts`.
Mappings are explicit by normalized GitHub repository name, not inferred from
text similarity, PR counts, or broad keyword matching.

Relationships currently covered:
- Civic Registry Transparency Engine -> Smart Cities Surveillance Registry
- Compliance Authorization Immutable Audit Engine -> Algorithmic Accountability; Federal Encryption Compliance
- Live Competition Engine -> MMS; Rap Battle Platform
- Secure Intake Case Workflow Engine -> National Secure Ideas Submission
- End-to-End Everywhere Security Architecture Standard -> End-to-End Everywhere Suite
- Distributed Audio Engine -> Distributed Radio Engine -> TrackZero; SceneSignal consumes Audio directly
- Music Operations Engine -> Unsealed Records Command Center
- Superintelligence Engine -> Superintelligence Academy; Superintelligence Command Center
- Live Debate Engine -> UBC Debates (planned downstream application)

When a user filters out the parent engine, a remaining child is displayed
without indentation, rather than bringing a hidden parent back into results.
All sort modes retain parent-child adjacency. Other projects remain standalone.
No hierarchy mapping alters project status, repository synchronization,
approved roadmaps, progress calculations, or financial totals.


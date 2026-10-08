# .exechub/project.yml manifest

PR 12 makes the repository manifest executable rather than documentary.

## Supported schema

The parser accepts the controlled Engine Room manifest sections:

- `project`: internal name, display name, repository coordinate, lifecycle status
- `roadmap`: version, approved planned-PR denominator, approval flag
- `milestones`: ordered milestone names and PR counts

The parser intentionally implements the small committed schema rather than accepting arbitrary YAML features. This keeps the ingest surface deterministic and prevents aliases, tags, executable extensions, or surprising coercions from entering roadmap state.

## Validation

A manifest is rejected when:

- required fields are absent or empty;
- roadmap version/counts are not positive integers;
- approval is not an explicit boolean;
- repository coordinates are not `owner/repository`;
- milestone PR counts do not sum exactly to `roadmap.planned_prs`;
- unsupported top-level sections or invalid indentation appear.

PR 13 stores approved parsed manifests as immutable plan versions.

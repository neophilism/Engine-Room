# Source software findings and GitHub acceptance

Engine Room stores each source unit's complete metadata during the live `registry/prs.json` import. The monitor query now carries `source_metadata.implementationReview` to the project readout. It validates the finding, review date, named source files and SHA-256 hashes, concrete software gap and separate release/activation requirement. A status label or contributing PR alone does not manufacture an implementation review.

The project shows source-reviewed implemented units, units with concrete software work remaining and units without a software review separately. Individual unit details retain the actual gap and activation requirement. These are source-authored findings, not an independent audit or a claim that a deployment is current.

GitHub PR acceptance continues to use live merged timestamps. Full-scope package mappings keep their existing denominator and join logic. Missing mappings and contributing PRs no longer become claims of partially implemented or unstarted software in labels, tooltips or screen-reader text. No bundled source registry or historical snapshot is recopied to update another project's progress; refresh still fetches the owning source and GitHub APIs.

Validation includes a database-query readout test, malformed-evidence tests and rendered UI checks proving an implemented page remains implemented when its full-scope PR mapping is absent and final video input is pending. Hosted CI retains the actual PostgreSQL and browser gates.

# Individual project dashboard

Project names on Home and Projects link to `/projects/{slug}`. The dashboard loads a registered project, linked repositories, current approved plan, milestones, and roadmap work in one read-only repeatable-read transaction. Unknown projects return 404; database failures show an unavailable state rather than a false 404.

Counts come from repository-scoped mappings to synchronized GitHub PRs and their real merge timestamps. Closed/unmerged, missing, and unmapped PRs do not increase completion. Portfolio and repository counts now use the same rule. Milestone calculations validate the approved graph, retaining the immutable denominator and explicit blocked state. Mapping gaps are visible.

CI uses an isolated PostgreSQL service to apply all migrations and exercise registration plus real portfolio/dashboard queries, including duplicate repository-local PR numbers. Local integration runs require `ENGINE_ROOM_TEST_DATABASE_URL` pointing to an empty disposable database. The test database is separate from the application `DATABASE_URL`.

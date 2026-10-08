# Approved roadmap vs ongoing repository development

Engine Room keeps two independently scoped work measurements.

- **Green — original roadmap:** merged GitHub pull requests *explicitly mapped* to the currently approved plan, divided by that plan's approved PR count. Completing all original units remains 100% even if additional PRs open later.
- **Amber — additional development:** every observed pull request in a project's linked repositories that is not mapped to an approved plan PR, classified as merged, open, or closed without merging. An additional PR is not necessarily an unfinished roadmap task, and closure without merge is not completion.
- **Unmapped projects:** original roadmap is **N/A**. Display observed repository PR activity separately, but do not invent an approved denominator or classify any PR as additional until approved mappings are complete.

For Engine Room the source-controlled initial plan contains 40 units with explicit GitHub PR mapping. New PRs (including numbers lower than 40 that were not in the original mapping) are classified by exact repository ID plus GitHub PR number, never by whether their PR number exceeds 40.

Data source: PostgreSQL `github_pull_requests`, `project_repositories`, `planned_pull_requests`, and `development_plans`. Counts use real provider merge timestamps; open and closed-without-merge remain separately visible. The homepage re-renders every 30 seconds while the browser tab is visible, and the count increases as soon as new GitHub events enter the database. Production fallback public GitHub reconciliation runs on startup and every two hours while awake; the webhook receiver verifies and stores delivery signatures but needs the event application worker to reduce latency. Do not claim immediate provider sync without an operational worker/webhook. The most recent provider observation time is visible to operators so they can distinguish current work from stale synchronization.

# Repository-owned roadmap protocol for Engine Room

Engine Room now prefers **one authoritative file in each source repository**:

\`registry/roadmap.json\`

If it exists, it takes precedence over older \`docs/DEVELOPMENT_PLAN.md\`, \`.exechub/project.yml\`, or other imported representations **for that repository only**. Projects using multiple repositories still sum the independent plans of their constituent repositories. Repositories without the canonical file keep their existing discovery and import behavior.

## File contract

\`\`\`json
{
  "repository": "neophilism/Example-App",
  "title": "Example App",
  "version": 1,
  "plannedPrCount": 3,
  "milestones": [
    {
      "id": "EX-01",
      "title": "Base infrastructure",
      "pullRequests": [12, 18]
    },
    {
      "id": "EX-02",
      "title": "Optional speech modes",
      "pullRequests": []
    },
    {
      "id": "EX-03",
      "title": "Acceptance tests",
      "origin": "addition",
      "pullRequests": ["https://github.com/neophilism/Example-App/pull/21"]
    }
  ]
}
\`\`\`

The top-level \`plannedPrCount\` (or optional \`plannedWorkTotal\`) is **validated against the actual array length**, never trusted as a standalone denominator. Each item represents **one distinct planned work unit**, typically one planned PR. Multiple linked GitHub PRs can be mapped to one work unit; that unit turns green only if **all linked PRs are confirmed merged**. If a repository already groups multiple PRs into one milestone (for example, the Public Debate Engine's existing 30-milestone register), its current denominator remains the number of milestones until the owner approves a more granular plan. **Count of milestones is not automatically the raw number of GitHub PRs**. Do not report otherwise.

Links in \`pullRequests\`, \`openPullRequests\`, \`pr\`, \`github_prs\` and \`githubPrNumbers\` must refer to real PR numbers in the **same repository**; bare integers are supported. Legacy links after an approved GitHub rename can be explicitly accepted through \`previousRepositoryNames: ["Old-Repo"]\`. Never infer mappings from a coincidental ordinal. The GitHub repository numeric ID preserves identity through rename, while the source plan's canonical \`repository\` field and links should be updated in the same release.

## Automatic refresh and coloring

Engine Room fetches that one canonical file during its existing authorized GitHub synchronization, using the repository's default branch. Its previous historical versions remain auditable. There is no need to edit an Engine Room allowlist for each new project. The active importer ignores older representation paths once the canonical file is available and indexed, preventing duplicate planned totals.

- **Green:** one plan unit whose complete explicit PR references have a verified GitHub merge timestamp.
- **Yellow:** one plan unit with a matching real, currently open PR, including failing or unmerged builds.
- **Empty:** all other planned work, including new approved PRs before creation.
- **Operational acceptance:** distinct from merge status; a green source PR does **not** prove deployment or completion of product acceptance.

If the file is absent, the legacy recognized plan paths remain. If malformed, the repository sync fails that source and retains the last valid materialized record instead of silently replacing it with a fabricated count. Explicit additions must be appended with stable IDs; update \`version\` and \`plannedPrCount\` as the owner approves new units. Unapproved proposals must **not** be added to the canonical count.

The Engine Room project heading already displays \`merged/planned\`. Adding more work units to an approved repository roadmap will increase the denominator on the **next successful** GitHub reconciliation; no manual Engine Room project-count edits should be necessary.

## Verification checklist

1. Add the file to a repository default branch with only approved items.
2. Run the GitHub reconciliation and confirm the imported file is the *only current source* for that repository in Engine Room.
3. Verify the total reflects the explicit array length and unmapped units stay empty.
4. Merge a mapped PR and synchronize; it should change from yellow to green.
5. Append a new planned unit, increase \`plannedPrCount\`, synchronize and confirm the progress denominator rises while the merged count does not.
6. Verify historical source-plan revisions remain readable and source-freshness indicators are correct. Do not claim a refresh succeeded if the service is rate-limited.

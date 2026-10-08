# GitHub development activity

Individual dashboards show a filterable recent timeline of PRs, commits, issues, reviews, and workflow runs with repository, actor, timestamp, state/conclusion, and safe GitHub links. PR events reuse full PR reconciliation; other records are upserted by repository + kind + provider identity. Repeated imports do not duplicate records, and extra activity never changes the roadmap numerator.

`reconcileGitHubDevelopmentActivity(config, installationId)` is an independent trusted-server reconciliation entry point. Run repository/PR reconciliation first. It needs the GitHub App's Contents, Issues, Pull requests, and Actions read permissions. Collection failure aborts this activity import without writing partial records or interrupting the separate core PR import. Production scheduling is configured in the automation milestone.

This is a bounded recent feed, not a historical archive: it collects the latest 100 commits, issue-shaped records, and workflow runs per repository; reviews come from the 10 most recently updated PRs, up to 100 each. PR-shaped issues and unsubmitted reviews are excluded. The dashboard displays at most 100 recent events. Permission errors do not become fabricated successful source records, and no workflow logs, credentials, or review bodies are stored.

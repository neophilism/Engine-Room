# Engine Room continuous integration

The owner made the development repositories public and directed Engine Room to use GitHub Actions. The duplicated CircleCI configuration is retired. Do not restore the former private-repository CI migration or use its status contexts as merge requirements.

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`. Its `validate` job retains Node 22, PostgreSQL 16 integration, type checks, lint, migration invariants, roadmap contracts, all unit and integration tests, the release build, a separate browser test database, and real Chromium browser journeys. Security status record integrity runs on every CI execution. Browser results are retained as artifacts when present. Obsolete runs for the same ref are canceled.

The shared PR registry contract remains a separate GitHub Actions check. The existing public production availability probe also remains on GitHub Actions. Passing CI and a responding public health endpoint do not establish authenticated dashboard acceptance or explain a process crash; deployment and runtime evidence remain separate.

Repository settings must not require `ci/circleci: full-verification` or `ci/circleci: security-status-record`. The repository configuration removal stops defining CircleCI jobs; it does not uninstall the organization's CircleCI application. Retire the obsolete CircleCI migration PR without merging it. Remove a repository-specific CircleCI project connection if administrative access is available, without altering other repositories.

Do not change repository visibility, purchase CI capacity, or select another provider without owner direction. If private-repository limits later prevent GitHub Actions from running, report the actual limit rather than silently installing another provider.

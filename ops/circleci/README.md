# CircleCI provider routing and restore gate

Chosen CircleCI organization **only**: https://app.circleci.com/organization/circleci/6Vqi2CTeH5RHCx66K21Noh

The user confirmed the GitHub App Cloud connection to personal owner `neophilism` with all-repository access on 2026-10-12. The user has **another** CircleCI organization: **do not use or change that organization**. `ops/circleci/provider-registry.json` is the canonical machine-readable project and PR inventory for this onboarding, and [issue #99](https://github.com/neophilism/Engine-Room/issues/99) is the human-readable acceptance ledger.

**Current status:** GitHub App connected, zero provider CI pipelines confirmed passing. Preparing a CircleCI config PR is not running CI. **No completed claim** without a provider-generated successful status matching the exact tested GitHub SHA and every originally-required job. Keep the existing GitHub Actions workflows until equivalent checks are proven; don't disable rules, fake successes, or spend money.

## First activation sequence

1. Inside the chosen CircleCI organization, Projects > Create Project > project name `HEARD`. Connect source repo `neophilism/HEARD`, choose existing config `.circleci/config.yml` and the feature branch `ci/circleci-native-full-suite-20261012` as **both config and checkout source** for the first manual test.
2. Trigger full pipeline on that branch, verify `full-verification` plus `security-status-record` (the latter is integrity only, not security certification). Inspect CircleCI logs/exit codes, confirm the CircleCI check status is posted to the exact PR SHA. Do not accept GitHub-hosted Actions failures as evidence of CircleCI success.
3. Repeat for `Engine-Room`, whose PR #97 contains the CI config and provider registry. Validate the entire PostgreSQL, migrations, roadmap, unit, TypeScript, lint, Next.js build and browser suites plus status integrity.
4. Activate the next repositories only after confirming Free plan credits and making a resource-aware sequence. Long browser/DB and macOS test suites consume credits rapidly.
5. After a real verified passing run of each repository's CircleCI equivalent, configure required status checks for that pipeline without downgrading required tests. Keep the historical GitHub Actions definitions as reference until the migration is complete.

## Limitations and prohibited shortcuts

- There is no direct CircleCI app/API connection available to this assistant. GitHub App authorization **inside CircleCI** does not grant the ChatGPT GitHub connector access to CircleCI projects; an authorized user must first complete CircleCI project creation and pipeline activation, or use a trusted CircleCI API integration later.
- No extra CircleCI accounts may be cycled to evade the Free plan's quotas. Different authorized organizations can be used only under CircleCI's plan terms, with billing disabled and the owner's approval.
- Projects marked `status-only` or `planning-and-status-only` do **not** have comprehensive CI yet. They need substantive tests written before representing them as verified.
- Music Analyzer requires real macOS packaging, clean-install and signing tests; Linux tests cannot substitute. National Secure Ideas production promotion, release evidence, and live deployment require separately authorized evidence and approvals; no fake green checks.
- The Oracle A1 capacity watch remains separate and must only signal fresh authenticated OCI capacity reports, not scrape guesses.

CircleCI docs: https://circleci.com/docs/guides/getting-started/create-project/ and https://circleci.com/docs/guides/orchestrate/set-up-multiple-configuration-files-for-a-project/

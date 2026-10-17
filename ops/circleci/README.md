# CircleCI provider routing and restore gate

Chosen CircleCI organization **only**: https://app.circleci.com/organization/circleci/6Vqi2CTeH5RHCx66K21Noh

The user confirmed the GitHub App Cloud connection to personal owner `neophilism` with all-repository access on 2026-10-12. The user has **another** CircleCI organization: **do not use or change that organization**. `ops/circleci/provider-registry.json` is the canonical machine-readable project and PR inventory for this onboarding, and [issue #99](https://github.com/neophilism/Engine-Room/issues/99) is the human-readable acceptance ledger.

**Current status (2026-10-12):** GitHub App connected. HEARD full CI passed on the exact manual-trigger SHA and again on a separate open-PR push triggered automatically; GitHub confirmed both mandatory CircleCI status contexts successful in both runs. HEARD PR #3 merged the `.circleci/config.yml` into main; PR #4 confirmed PR automation and was merged. Engine Room and the remaining 19 projects still have **no verified passing CircleCI pipeline**. A separate default-branch push trigger is still needed for HEARD. Preparing a CircleCI config PR is not running CI. **No completed claim** without a provider-generated successful status matching the exact tested GitHub SHA and every originally-required job. Keep the existing GitHub Actions workflows until equivalent checks are proven; don't disable rules, fake successes, or spend money.

## First activation sequence

1. **Done:** HEARD CircleCI project created. The manual `full-ci` run succeeded on `a9d68b7`; the additional GitHub push-to-open-PR run automatically started and passed both jobs on `2fcda3b8`. Matching SHA-specific GitHub commit statuses were verified.
2. **Outstanding for HEARD:** In CircleCI > HEARD > Project Settings > Triggers, add a second GitHub App trigger for **Pushes to default branch**, and verify that a subsequent main-branch commit receives both passing CircleCI statuses. The existing trigger for pushes to open non-draft PRs has already been exercised successfully. E2EESA status integrity is not a security certification.
3. **Next user setup action:** Create CircleCI project **Engine-Room** inside the same selected organization, using repo `neophilism/Engine-Room`, path `.circleci/config.yml`, pipeline `full-ci`, trigger **Pushes to open non-draft PRs**. For the manual first run choose `ci/circleci-native-full-suite-20261012` as both Config Source and Checkout Source. Inspect the entire PostgreSQL, migrations, roadmap, unit, TypeScript, lint, Next.js build and Playwright browser suites plus status integrity. Do not merge PR #97 until both jobs pass.
4. Activate the next repositories only after confirming Free plan credits and making a resource-aware sequence. Long browser/DB and macOS test suites consume credits rapidly.
5. After a real verified passing run of each repository's CircleCI equivalent, configure required status checks for that pipeline without downgrading required tests. Keep the historical GitHub Actions definitions as reference until the migration is complete.

## Limitations and prohibited shortcuts

- There is no direct CircleCI app/API connection available to this assistant. GitHub App authorization **inside CircleCI** does not grant the ChatGPT GitHub connector access to CircleCI projects; an authorized user must first complete CircleCI project creation and pipeline activation, or use a trusted CircleCI API integration later.
- No extra CircleCI accounts may be cycled to evade the Free plan's quotas. Different authorized organizations can be used only under CircleCI's plan terms, with billing disabled and the owner's approval.
- Projects marked `status-only` or `planning-and-status-only` do **not** have comprehensive CI yet. They need substantive tests written before representing them as verified.
- Music Analyzer requires real macOS packaging, clean-install and signing tests; Linux tests cannot substitute. National Secure Ideas production promotion, release evidence, and live deployment require separately authorized evidence and approvals; no fake green checks.
- The Oracle A1 capacity watch remains separate and must only signal fresh authenticated OCI capacity reports, not scrape guesses.

CircleCI docs: https://circleci.com/docs/guides/getting-started/create-project/ and https://circleci.com/docs/guides/orchestrate/set-up-multiple-configuration-files-for-a-project/

# Justice For All new repository onboarding — October 10, 2026

Engine Room discovers GitHub repositories; projects with approved `.exechub/project.yml` manifest have verifiable **planned** work-package totals. A repository must never count unreviewed bootstrap commits as completed mapped work packages.

## Verified newly added project manifests

| Repository | Planned work packages | Manifest | Implementation truth |
|---|---:|---|---|
| [The Public Record](https://github.com/neophilism/The-Public-Record) | 52 | [manifest](https://github.com/neophilism/The-Public-Record/blob/main/.exechub/project.yml) | Foundation scaffold committed; 0 accepted work packages pending evidence |
| [Justice For All core](https://github.com/neophilism/Justic-For-All) | 50 | [manifest](https://github.com/neophilism/Justic-For-All/blob/main/.exechub/project.yml) | Verify live PR and acceptance evidence; planning denominator is not completion |

The spelling `Justic-For-All` is the actual verified repository name; do not silently substitute a different repository.

## Engine Room discovery and refresh

1. GitHub discovery is implemented in `lib/github/discovery.ts`; manifest validation and import in `lib/github/manifest-discovery.ts`.
2. Production public repositories are imported through the public-GitHub synchronization process, subject to uptime and authenticated rate limits. An authorized admin can trigger **Synchronize now** from Engine Room settings when GitHub integration credentials permit.
3. Refresh GitHub project data after manifest writes. If a repository still shows `unscored`, confirm the sync was successful and that manifest names and schema pass parsing.
4. Map approved work units to actual merged PR numbers through an audited, explicit PR mapping; do not infer completion from total commits or arbitrary numbering.
5. Display `unverified` rather than `0%` or `100%` for missing evidence, and explicitly distinguish repo discovered, plan registered, code merged, deployment live, and production accepted.

## Other recent repositories

Engine Room must also discover the full current accessible owner repository list rather than using a manually fixed shortlist. That includes recent repositories for software initiatives, but their PR denominators **must only** come from their own approved manifest. A missing manifest leaves a project discoverable and unscored, not silently absent.

## Verification still required

Verify deployment's latest GitHub synchronization, ensure both named projects appear with correct denominators, inspect actual merged/accepted work-package mappings, and confirm the live Engine Room has reflected the latest refresh. Committing this note does **not** claim production database synchronization has occurred.

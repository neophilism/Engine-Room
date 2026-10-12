# GitHub About, hierarchy and project updates

GitHub's repository `description` (the About text) is authoritative for each
primary repository's project Summary. Every manual and scheduled repository
reconciliation fetches repository metadata. Existing text changes and intentional
deletions propagate to the dashboard; refreshing only the display reads the stored
result. Metadata failures are separate from authoritative PR queries and make
the refresh report partial without discarding working PR counts.

The owner authorized initial missing descriptions on October 12, 2026.
`lib/config/repository-about-seed.json` records the reviewed descriptions and
README blob evidence for 39 repositories created in 2026 plus the explicitly
included FOIA Bias Analysis repository. The live worker applies this seed once
per repository, only to an empty About description, with GitHub readback before
success. Existing or subsequently edited owner text is preserved. GitHub
administration permission is necessary for the write; no token permission is
changed or assumed. `repository_about_seed` records completion or HTTP failure.

`repository_latest_activity` stores the latest observed GitHub development event
and original timestamp. PR opening, merging, closing and later updates are distinct;
push webhooks can identify an open PR's head, default-branch commits and other
branch pushes. Repository `pushed_at` alone does not prove a direct edit or a
particular PR. A squash commit matching a real merged PR is not labeled a direct
edit. A sync time is never substituted for the source event time.

The project card displays the date/time in Eastern Time, an update type and a
GitHub source link. An empty repository shows no invented update date.

Explicit dependencies live in `lib/domain/project-hierarchy.ts`; every sort keeps
the visible engine and its descendants adjacent. Filtered parents are not forced
back into the results. Indentation applies to the full project card.

Refresh notifications offer immediate dismissal and expire after ten seconds.
The manual request also has a bounded client timeout so an unavailable upstream
cannot leave the control permanently disabled.

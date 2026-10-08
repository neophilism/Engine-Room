# Recorded users and access

PR 35 introduces identity observations scoped to a project, environment and source authority. Each source supplies a stable principal ID and unique observation ID, person/service kind, display name, explicit status, roles, privilege flag, MFA state (including null/unknown), source timestamp, optional organization identity/name, last activity and credential expiry. Display names may be pseudonyms; email addresses and credential values are not required or stored.

Observations are immutable. Identical source observations deduplicate; changed content under the same identity is rejected. The roster selects the latest source timestamp per principal, so late older deliveries do not reactivate suspended users. Absence from a bounded delivery does not imply deletion: producers must send explicit suspended/deleted observations.

The signed canonical telemetry adapter accepts access-observation records with these fields; project/environment/source come from the credential, requiring the access-observation capability. Built-in admin/owner role names must declare privileged access. This data describes monitored projects' access, not Engine Room authentication or automatic enforcement of access changes.

The Users & Access page searches names/IDs/organizations/roles, filters project/status/environment, shows explicit MFA/expiry unknowns, and labels observations older than 24 hours stale. Counts measure recorded project grants rather than verified unique customers or login sessions.

# Cross-project access analytics

PR 36 groups latest recorded grants by source authority and stable principal/organization IDs. A configured source name is an identity namespace: use different names for tenants or authorities whose IDs are not globally comparable. Display names, email-like strings and role names never bridge source namespaces.

The Users page compares unique recorded identities, active project grants, observed-project coverage, organizations and source role distribution. Deleted/suspended grants do not count active. Counts still describe observations; stale grants may remain recorded active and their freshness must be reviewed.

Access findings flag current privileged people with MFA disabled/unknown, inactive privileged grants older than 90 days, expired service credentials, privileged services with unknown expiry, and current privileged access across at least three projects. Observations older than 24 hours or dated in the future produce a freshness finding instead of a current posture assessment. These review heuristics do not revoke permissions, establish policy compliance, or make a missing feed safe.

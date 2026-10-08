# Engine Room private access — deployment and acceptance

The application is **invite-only** and all portfolio pages require a registered session. No anonymous registrations are permitted. Administrators can issue one-time invitations for other administrators or portfolio viewers. Individual passwords are hashed with salted scrypt; 32-byte random session tokens are stored only as SHA-256 digests in PostgreSQL. Cookies are HttpOnly, Secure in production, SameSite=Strict, scoped to /. A Node runtime middleware checks the database on every protected request, allowing immediate session/user revocation.

## One-time first administrator enrollment

1. Deploy migration 0016 with `npm start` (startup applies migrations), verify `/api/ready`.
2. Set `ENGINE_ROOM_BOOTSTRAP_TOKEN` to a unique, unguessable 32+ character secret **in Render environment**, not the repository or chat.
3. Open `/setup`, choose the first administrator email, display name, and a unique 12+ character password, and enter the bootstrap token.
4. The setup endpoint refuses all further administrator enrollments once any administrator exists. Remove the bootstrap variable after enrollment.
5. Sign in from `/login`. Other users register only through the one-time links issued at `/account`.

## Production safeguards

- Login rejects non-same-origin form submissions; passwords are never logged.
- Repeated wrong passwords lock an account for 15 minutes after five failures.
- User-session cookies are revocable and expire after 12 hours.
- Viewer access is limited to general portfolio pages. Financial, users, settings, operations, alerts, releases, and management endpoints require administrator status. Signed GitHub webhook and telemetry intake remain independently authenticated.
- The legacy admin bearer token is still an additional condition for the old administrative control endpoints; login does not make those secret API credentials public.
- This implementation requires an independent security review (including authentication, session handling, invitation leakage, brute-force handling and CSRF) before attaching production financial or personnel records. Do not record that review as complete until performed.

## Acceptance

Check unauthenticated GET requests to /, /projects, /finance, /users, /settings (redirect to /login) and /api/admin/settings (401). Check /api/health and /api/ready remain accessible. Create the first administrator, sign in, sign out, sign in again, issue and consume a one-use viewer invitation, verify the code cannot be reused, verify viewer cannot visit sensitive pages, and verify a revoked session immediately stops working. Record observed responses and evidence in production acceptance.

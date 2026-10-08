# Settings and automation control plane — PR 37

## Deployment requirements

Set `DATABASE_URL`, `ENGINE_ROOM_ADMIN_TOKEN` (at least 32 random characters), `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, and `GITHUB_INSTALLATION_ID` in the trusted server environment. Never commit these values or store them in the database. Run `db/migrations/0015_control_settings.sql` in order after earlier migrations.

## Administrator access

Use the Settings dashboard to supply the administrator token for the current page session. The browser does not persist it. The `GET/PUT /api/admin/settings` and `POST /api/admin/reconcile` routes require an exact bearer token. Unconfigured administrative access fails closed. They return cache-disabled responses and avoid secret echoing. The instance must be served exclusively over HTTPS for production; a bearer token is a bootstrap authentication mechanism, not an organizational SSO/MFA gateway.

Settings changes use a required expected revision to reject conflicting writes and append an audit entry in the same PostgreSQL transaction. A no-op update does not advance the revision.

## GitHub reconciliation

`POST /api/admin/reconcile` accepts `{"mode":"manual"}` or `{"mode":"scheduled"}`. Manual mode runs a single on-demand reconciliation for the configured installation. Scheduled mode checks the saved enabled flag, enforces the minimum interval, and skips concurrent runs. It must be called by an authenticated trusted scheduler; enabling the flag alone schedules nothing. PR 40 will provision scheduler and production operations. Errors are not treated as successful reconciliations.

## Scope of this PR

Progress calculations are determined from approved-plan mappings and GitHub evidence, not manually adjustable percentages. Project registration remains guarded by approved repository manifests; it is not bypassed through Settings. Notification delivery and identity-based permissions require production providers/gateways and are not represented as active. Retention is documented pending production enforcement, to avoid implying unaudited deletion of operational records.

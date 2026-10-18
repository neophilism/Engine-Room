# Idle database connection recovery

On October 18 the owner reported a Render email stating that Engine Room exited with status 1 at approximately 18:02 America/New_York. Subsequent public checks returned health and readiness HTTP 200, login HTTP 200, and an unauthenticated redirect to login, on deployed commit `f97cc91a7667018e49fc501688e7dd1ad30109ce`. Those observations establish recovery at the check time; they do not establish the crash cause or authenticated dashboard acceptance. Render crash logs were not available without identifying the workspace.

Source inspection identified a concrete independent crash path. Both long-running `pg` pools lacked an `error` listener. When an idle database connection fails, `pg-pool` first removes that client and then emits `error` on the pool. Node's default unhandled error event terminates the process. An idle disconnect must not terminate the web process or repeatedly restart its worker.

The web and worker pools now register the same narrow idle-error handler. The pool still discards the failed connection and creates a replacement on demand. Query failures continue to reject normally; no success is fabricated and no arbitrary global exception handler is installed. Logs contain only a fixed message and bounded SQLSTATE, excluding connection objects, error messages and credentials.

Regression coverage includes unhandled-event prevention and log redaction, plus a real PostgreSQL test that terminates an isolated idle backend with `pg_terminate_backend`, observes `57P01`, and proves the next query uses a new backend successfully. Hosted CI must pass before merge. Confirming whether this failure path caused the reported incident still requires the actual Render runtime logs.

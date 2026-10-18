// pg-pool has already removed an idle client before emitting this event.
// Handling it prevents EventEmitter's default process-terminating error path.
// Query errors still reject normally and remain visible to their callers.
export function handleIdlePoolErrors(pool, report = console.error) {
  pool.on("error", error => {
    const code = typeof error?.code === "string" && /^[A-Z0-9]{5}$/.test(error.code)
      ? error.code : "UNAVAILABLE";
    // Never log the error object or client: either can include connection data.
    report("Database idle connection lost; the pool discarded it and will reconnect.", { code });
  });
  return pool;
}

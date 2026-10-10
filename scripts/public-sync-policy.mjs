/** Pure production sync policy. Off for test and non-production by default. */
export const PUBLIC_SYNC_INTERVAL_MS = 2 * 60 * 60 * 1000;
export const AUTHENTICATED_SYNC_INTERVAL_MS = 15 * 60 * 1000;

/** Fast polling is allowed only with server-side GitHub credentials. */
export function publicSyncIntervalMs(env) {
  return env.GITHUB_READ_TOKEN?.trim() ? AUTHENTICATED_SYNC_INTERVAL_MS : PUBLIC_SYNC_INTERVAL_MS;
}

export function shouldRunPublicSync(env, testServer = false) {
  if (testServer) return false;
  const selected = env.ENGINE_ROOM_PUBLIC_GITHUB_SYNC;
  if (selected === "0") return false;
  if (selected === "1") return true;
  if (selected !== undefined && selected !== "") return false; // Unknown flags fail closed.
  return env.NODE_ENV === "production";
}

/** Pure production sync policy. Off for test and non-production by default. */
export const PUBLIC_SYNC_INTERVAL_MS = 2 * 60 * 60 * 1000;

export function shouldRunPublicSync(env, testServer = false) {
  if (testServer) return false;
  const selected = env.ENGINE_ROOM_PUBLIC_GITHUB_SYNC;
  if (selected === "0") return false;
  if (selected === "1") return true;
  if (selected !== undefined && selected !== "") return false; // Unknown flags fail closed.
  return env.NODE_ENV === "production";
}

import assert from "node:assert/strict";
import { PUBLIC_SYNC_INTERVAL_MS, AUTHENTICATED_SYNC_INTERVAL_MS, publicSyncIntervalMs, shouldRunPublicSync } from "./public-sync-policy.mjs";

assert.equal(shouldRunPublicSync({ NODE_ENV: "production" }), true);
assert.equal(shouldRunPublicSync({ NODE_ENV: "development" }), false);
assert.equal(shouldRunPublicSync({ NODE_ENV: "test" }), false);
assert.equal(shouldRunPublicSync({ NODE_ENV: "production", ENGINE_ROOM_PUBLIC_GITHUB_SYNC: "0" }), false);
assert.equal(shouldRunPublicSync({ NODE_ENV: "development", ENGINE_ROOM_PUBLIC_GITHUB_SYNC: "1" }), true);
assert.equal(shouldRunPublicSync({ NODE_ENV: "production", ENGINE_ROOM_PUBLIC_GITHUB_SYNC: "typo" }), false);
assert.equal(shouldRunPublicSync({ NODE_ENV: "production", ENGINE_ROOM_PUBLIC_GITHUB_SYNC: "1" }, true), false);
assert.equal(PUBLIC_SYNC_INTERVAL_MS, 7200000);
assert.equal(AUTHENTICATED_SYNC_INTERVAL_MS, 900000);
assert.equal(publicSyncIntervalMs({}), 7200000);
assert.equal(publicSyncIntervalMs({ GITHUB_READ_TOKEN: "  " }), 7200000);
assert.equal(publicSyncIntervalMs({ GITHUB_READ_TOKEN: "nonempty-token" }), 900000);
console.log("Public GitHub synchronization policy tests passed.");

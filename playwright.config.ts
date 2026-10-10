import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:3108",
    reducedMotion: "no-preference",
    launchOptions: process.env.ENGINE_ROOM_CHROMIUM_PATH
      ? { executablePath: process.env.ENGINE_ROOM_CHROMIUM_PATH }
      : {},
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure"
  },
  webServer: {
    env: { ENGINE_ROOM_TEST_SERVER: "1", DATABASE_URL: process.env.ENGINE_ROOM_BROWSER_DATABASE_URL || "", ENGINE_ROOM_BASE_URL: "http://127.0.0.1:3108",GITHUB_WEBHOOK_SECRET:'browser-fixture-secret-for-signed-delivery-tests',NODE_OPTIONS:'--import ./scripts/local-test-network.mjs' },
    command: "node scripts/migrate.mjs && npm run start -- --hostname 127.0.0.1 --port 3108",
    url: "http://127.0.0.1:3108",
    reuseExistingServer: !process.env.CI
  }
});

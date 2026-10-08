import { expect, test, type Page, type BrowserContext } from "@playwright/test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";

let browserSessionToken = "";
let browserTestUserId = "";
const sessionCookie = () => ({
  name: "engine_room_session", value: browserSessionToken, domain: "127.0.0.1",
  path: "/", secure: false, httpOnly: true, sameSite: "Strict" as const,
  expires: Math.floor(Date.now() / 1000) + 3600
});
async function installSession(context: BrowserContext) {
  await context.addCookies([sessionCookie()]);
}
test.beforeAll(async () => {
  const url = process.env.ENGINE_ROOM_BROWSER_DATABASE_URL;
  if (!url) throw new Error("Browser regression tests require isolated PostgreSQL.");
  browserSessionToken = randomBytes(32).toString("base64url");
  browserTestUserId = randomUUID();
  const db = new Pool({ connectionString: url });
  try {
    await db.query(
      "INSERT INTO engine_room_users(id,email,display_name,password_hash,role) VALUES($1,$2,$3,$4,'admin')",
      [browserTestUserId, `browser-${browserTestUserId}@example.invalid`, "Playwright Test", "test-fixture-no-login"]
    );
    await db.query(
      "INSERT INTO engine_room_auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '2 hours')",
      [createHash("sha256").update(browserSessionToken).digest("hex"), browserTestUserId]
    );
  } finally { await db.end(); }
});
test.beforeEach(async ({ context }) => { await installSession(context); });
test.afterAll(async () => {
  const url = process.env.ENGINE_ROOM_BROWSER_DATABASE_URL;
  if (!url || !browserTestUserId) return;
  const db = new Pool({ connectionString: url });
  try { await db.query("DELETE FROM engine_room_users WHERE id=$1", [browserTestUserId]); }
  finally { await db.end(); }
});

async function motionStyles(page: Page) {
  return page.evaluate(() => {
    const style = (selector: string) => getComputedStyle(document.querySelector(selector)!);
    return {
      pipe: style(".machine-flow-pipe-desktop .machine-pipe-flow").animationName,
      lamp: style(".machine-state-readout .machine-lamp-glint").animationName,
      needle: style(".machine-gauge-needle").transitionDuration,
      fill: style(".machine-preview-tube .machine-tube-fill").transitionDuration,
      valve: style(".machine-valve-wheel").transitionDuration
    };
  });
}

async function expectMotionStopped(page: Page) {
  const styles = await motionStyles(page);
  expect(styles.pipe).toBe("none");
  expect(styles.lamp).toBe("none");
  for (const duration of [styles.needle, styles.fill, styles.valve]) {
    expect(duration.split(",").every((value) => Number.parseFloat(value) === 0)).toBe(true);
  }
}

test("powered machines animate and reconcile status and values immediately", async ({ page }) => {
  await page.goto("/");
  const styles = await motionStyles(page);
  expect(styles.pipe).toBe("machine-pipe-flow");
  expect(styles.lamp).toBe("machine-lamp-breathe");
  expect(styles.needle).toBe("0.64s");
  const statuses = page.getByRole("combobox", { name: "Preview machine state" });
  for (const state of ["active", "warning", "blocked", "offline", "complete", "live"]) {
    await statuses.selectOption(state);
    await expect(page.getByRole("status")).toHaveText(`Preview machine: ${state[0].toUpperCase()}${state.slice(1)}`);
    if (!["active", "live"].includes(state)) {
      await expect.poll(async () => (await motionStyles(page)).lamp).toBe("none");
    }
  }
  await statuses.selectOption("complete");
  await expect(page.getByRole("meter", { name: "Preview workload" })).toHaveAttribute("aria-valuenow", "100");
  await expect(page.getByRole("progressbar", { name: "Preview progress" })).toHaveAttribute("aria-valuenow", "100");
});

test("system reduced motion applies before hydration, even with JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: "reduce" });
  await installSession(context);
  const page = await context.newPage();
  try {
    await page.goto("http://127.0.0.1:3108/");
    await expectMotionStopped(page);
    await expect(page.getByRole("status")).toHaveText("Preview machine: Live");
    await expect(page.getByRole("meter", { name: "Preview workload" })).toHaveAttribute("aria-valuenow", "25");
  } finally {
    await context.close();
  }
});

test("changing the system preference cancels motion without disabling state updates", async ({ page }) => {
  await page.goto("/");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expectMotionStopped(page);
  await page.getByRole("combobox", { name: "Preview machine state" }).selectOption("active");
  await expect(page.getByRole("status")).toHaveText("Preview machine: Active");
  await expect(page.getByRole("meter", { name: "Preview workload" })).toHaveAttribute("aria-valuenow", "65");
  await expectMotionStopped(page);
  await page.getByRole("button", { name: "Pause machine motion" }).click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expectMotionStopped(page);
  await page.getByRole("button", { name: "Pause machine motion" }).click();
  expect((await motionStyles(page)).pipe).toBe("machine-pipe-flow");
});

test("keyboard pause stops continuous animation while controls and values still work", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Pause machine motion" });
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expectMotionStopped(page);
  await page.getByRole("button", { name: "Run preview: closed" }).click();
  await expect(page.getByRole("status")).toHaveText("Preview machine: Active");
  await expect(page.getByRole("meter", { name: "Preview workload" })).toHaveAttribute("aria-valuenow", "65");
  await expectMotionStopped(page);
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Projects", exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
});

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  for (const width of [1440, 900, 390]) {
    test(`routing is preserved at ${width}px with ${reducedMotion} motion`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ reducedMotion });
      await page.goto("/");
      await expect(page.locator(".machine-flow-connector")).toHaveCount(3);
      const desktop = page.locator(".machine-flow-pipe-desktop").first();
      const mobile = page.locator(".machine-flow-pipe-mobile").first();
      await expect(width > 1100 ? desktop : mobile).toBeVisible();
      await expect(width > 1100 ? mobile : desktop).toBeHidden();
      await expect(page.getByRole("button", { name: "Pause machine motion" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const connectorBox = await (width > 1100 ? desktop : mobile).boundingBox();
      await page.getByRole("combobox", { name: "Preview machine state" }).selectOption("blocked");
      expect(await (width > 1100 ? desktop : mobile).boundingBox()).toEqual(connectorBox);
    });
  }
}

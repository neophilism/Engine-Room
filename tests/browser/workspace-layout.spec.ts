import { expect, type BrowserContext } from "@playwright/test";
import { test } from "./fixtures";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";

let token = "";
let userId = "";
const session = () => ({
  name: "engine_room_session", value: token, domain: "127.0.0.1",
  path: "/", secure: false, httpOnly: true, sameSite: "Strict" as const,
  expires: Math.floor(Date.now() / 1000) + 3600
});
const authenticate = async (context: BrowserContext) => {
  await context.addCookies([session()]);
};

test.beforeAll(async () => {
  const databaseUrl = process.env.ENGINE_ROOM_BROWSER_DATABASE_URL;
  if (!databaseUrl) throw new Error("Browser UI checks require the isolated PostgreSQL fixture.");
  token = randomBytes(32).toString("base64url");
  userId = randomUUID();
  const db = new Pool({ connectionString: databaseUrl });
  try {
    await db.query(
      "INSERT INTO engine_room_users(id,email,display_name,password_hash,role) VALUES($1,$2,$3,$4,'admin')",
      [userId, `workspace-${userId}@example.invalid`, "Workspace Test", "test-fixture-no-login"]
    );
    await db.query(
      "INSERT INTO engine_room_auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '2 hours')",
      [createHash("sha256").update(token).digest("hex"), userId]
    );
  } finally { await db.end(); }
});

test.beforeEach(async ({ context }) => { await authenticate(context); });

test.afterAll(async () => {
  const databaseUrl = process.env.ENGINE_ROOM_BROWSER_DATABASE_URL;
  if (!databaseUrl || !userId) return;
  const db = new Pool({ connectionString: databaseUrl });
  try { await db.query("DELETE FROM engine_room_users WHERE id=$1", [userId]); }
  finally { await db.end(); }
});

test("primary portfolio progress is immediately available without the legacy animation lab", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Engine Room", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Project progress" })).toBeVisible();
  await expect(page.locator(".portfolio-stat-grid").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause machine motion" })).toHaveCount(0);
  await expect(page.getByText("Machine animation preview")).toHaveCount(0);
  await expect(page.getByText("Roadmap signal path")).toHaveCount(0);
  await expect(page.getByText("CONTROL BUS")).toHaveCount(0);
  const advanced = page.locator(".dashboard-operations-details");
  await expect(advanced).toHaveCount(1);
  expect(await advanced.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(false);
});

test("operational and deployment detail remains accessible on demand", async ({ page }) => {
  await page.goto("/");
  const advanced = page.locator(".dashboard-operations-details");
  await advanced.locator("summary").click();
  await expect(advanced).toHaveAttribute("open", "");
  await expect(page.getByRole("heading", { name: "Current development activity" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Compact monitor" })).toBeVisible();
});

for (const width of [1440, 900, 390]) {
  test(`project navigation stays compact at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Projects", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Lifecycle" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Sort projects" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pause machine motion" })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    if (width < 761) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(page.getByLabel("Mobile navigation")).toBeVisible();
      await expect(page.getByLabel("Mobile navigation").getByRole("link", { name: "Projects" })).toBeVisible();
    } else {
      await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Projects" })).toBeVisible();
    }
  });
}

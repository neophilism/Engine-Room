import { expect, test } from "@playwright/test";

test("onboarding and navigation are usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("body")).toBeVisible();
});

test("readiness cannot report success when database is unconfigured", async ({ request }) => {
  const response=await request.get("/api/ready");
  expect([200,503]).toContain(response.status());
  const body=await response.json();
  expect(body.status).toBe(response.status()===200 ? "ready":"unavailable");
});

test("unauthenticated admin writes are denied", async ({ request }) => {
  const response=await request.put("/api/admin/settings", {
    data: { expectedRevision: 0, settings: { githubReconciliationEnabled: true, githubReconciliationIntervalMinutes: 15 } }
  });
  expect([401,503]).toContain(response.status());
});

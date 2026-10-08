import { test, expect } from "@playwright/test";
test("anonymous visitors cannot access portfolio or privileged dashboards", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto("http://127.0.0.1:3108/");
    await expect(page).toHaveURL(/\/login\?next=/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await page.goto("http://127.0.0.1:3108/finance");
    await expect(page).toHaveURL(/\/login\?next=%2Ffinance/);
    const api = await context.request.get("http://127.0.0.1:3108/api/admin/settings");
    expect(api.status()).toBe(401);
  } finally { await context.close(); }
});
test("new users require a secret bootstrap code or administrator invitation", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto("http://127.0.0.1:3108/setup");
    await expect(page.getByRole("heading", { name: "Register the first administrator" })).toBeVisible();
    await page.goto("http://127.0.0.1:3108/register");
    await expect(page.getByRole("heading", { name: "Accept your invitation" })).toBeVisible();
    const bootstrap = await context.request.post("http://127.0.0.1:3108/api/auth/bootstrap",{
      data:{email:"not-valid",password:"not-valid",bootstrapCode:"not-valid"},
      headers:{Origin:"https://malicious.invalid"}
    });
    expect(bootstrap.status()).toBe(403);
  } finally { await context.close(); }
});

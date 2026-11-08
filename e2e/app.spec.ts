import { expect, test } from "@playwright/test";

test.describe("signed out", () => {
  test("any page sends you to sign in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in to your assistant." })).toBeVisible();
  });

  test("the chat API refuses requests without a session", async ({ request }) => {
    const res = await request.post("/api/chat", { data: {} });
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Sign in required" });
  });

  test("the sign-in form validates before calling Supabase", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("someone@example.com");
    // Bypass the browser's own minlength check to reach the server-side validation.
    await page.getByLabel("Password").evaluate((el) => el.removeAttribute("minlength"));
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Sign in" }).click();
    // Next adds its own empty role="alert" route announcer, so match on the text.
    await expect(page.getByRole("alert").filter({ hasText: "Passwords are at least 8 characters" })).toBeVisible();
  });

  test("the page has no horizontal scroll", async ({ page }) => {
    await page.goto("/login");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

// Runs only with a real Supabase project and a test account:
// E2E_EMAIL=... E2E_PASSWORD=... npm run e2e
test.describe("signed in", () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "set E2E_EMAIL and E2E_PASSWORD to run");

  test("sign in, ask a question, get a saved answer", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(process.env.E2E_EMAIL!);
    await page.getByLabel("Password").fill(process.env.E2E_PASSWORD!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/chat\/[0-9a-f-]{36}$/);

    await page.getByLabel("Message").fill("Reply with just the word: pineapple");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("main").getByText(/pineapple/i).last()).toBeVisible({ timeout: 30_000 });

    // The chat survives a reload because it is stored in Supabase.
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible({ timeout: 30_000 });
    await page.reload();
    await expect(page.getByText("Reply with just the word: pineapple")).toBeVisible();
  });
});

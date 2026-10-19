import { test as base, expect, type Page } from "@playwright/test";

export const DEMO = { email: "aigerim@example.com", password: "password123" };
export const PHOTO = new URL("../../frontend/public/demo/cake.jpg", import.meta.url).pathname;

/**
 * Every test fails on a console error or an uncaught exception in any page it opened.
 * A test that expects an HTTP error (a wrong PIN is a 403) lists its status in `allowHttpErrors`;
 * the browser logs those as "Failed to load resource".
 */
export const test = base.extend<{ allowHttpErrors: number[]; consoleErrors: string[] }>({
  allowHttpErrors: [[], { option: true }],
  consoleErrors: [
    async ({ context, allowHttpErrors }, use) => {
      const errors: string[] = [];
      const watch = (page: Page) => {
        page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
        page.on("console", (m) => {
          if (m.type() !== "error") return;
          const http = /Failed to load resource: the server responded with a status of (\d+)/.exec(m.text());
          if (http && allowHttpErrors.includes(Number(http[1]))) return;
          errors.push(m.text());
        });
      };
      context.pages().forEach(watch);
      context.on("page", watch);
      await use(errors);
      expect(errors, "console errors").toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

/** A unique email per test and project, so both projects can share one database. */
export const uniqueEmail = (label: string) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;

export async function logIn(page: Page, email = DEMO.email, password = DEMO.password) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function signUp(page: Page, name: string, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "My tags" })).toBeVisible();
}

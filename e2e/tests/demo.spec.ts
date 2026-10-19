import { test, expect, logIn } from "./fixtures";

test("the demo account sees its tags, opens a tag and prints labels for its move", async ({ page }) => {
  await logIn(page);
  await expect(page.getByRole("heading", { name: "My tags" })).toBeVisible();
  await expect(page.getByRole("article").first()).toBeVisible();
  await page.goto("/tags/t_keys");
  await expect(page.getByRole("heading", { name: "Keys to your first home" })).toBeVisible();
  const media = page.locator(".media-item img");
  await expect(media.first()).toBeVisible();
  await page.goto("/print?move=m_astana");
  await expect(page.getByTestId("label")).toHaveCount(12);
  await expect(page.getByTestId("sheet")).toHaveCount(2);
});

test("the console check itself fails a test that logs an error", async ({ page }) => {
  test.fail(); // proves the fixture in fixtures.ts is active
  await page.goto("/login");
  await page.evaluate(() => console.error("boom"));
});

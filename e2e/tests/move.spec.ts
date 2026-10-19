import { test, expect, signUp, uniqueEmail } from "./fixtures";
import type { Page } from "@playwright/test";

async function addBox(page: Page, title: string, room: string, items: string[]) {
  await page.getByRole("link", { name: "Add box" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Room").fill(room);
  for (const [i, item] of items.entries()) {
    await page.getByLabel(`Item ${i + 1}`, { exact: true }).fill(item);
    if (i < items.length - 1) await page.getByLabel(`Item ${i + 1}`, { exact: true }).press("Enter");
  }
  await page.getByRole("button", { name: "Create tag" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

test("a move with two boxes: numbering, search, and printable labels", async ({ page }) => {
  await signUp(page, "Timur", uniqueEmail("move"));
  await page.goto("/moves");
  await page.getByRole("button", { name: "New move" }).click();
  await page.getByLabel("Name").fill("Dorm to flat");
  await page.getByRole("button", { name: "Create move" }).click();
  await expect(page.getByRole("heading", { name: "Dorm to flat" })).toBeVisible();
  const moveUrl = page.url();

  await addBox(page, "Books and lamp", "Study", ["Desk lamp", "Physics textbook"]);
  await expect(page.getByText("BOX 01").first()).toBeVisible();
  await page.goto(moveUrl);
  await addBox(page, "Kitchen stuff", "Kitchen", ["Kettle", "Two mugs"]);
  await expect(page.getByText("BOX 02").first()).toBeVisible();

  await page.goto(moveUrl);
  await expect(page.getByText("2 boxes")).toBeVisible();
  await page.getByLabel("Where is my...").fill("kettle");
  const results = page.locator(".hits");
  await expect(results.getByRole("link")).toHaveCount(1);
  await expect(results).toContainText("BOX 02");
  await expect(results).toContainText("Kitchen");
  await expect(results.locator("mark")).toHaveText(["Kettle"]);
  await page.getByLabel("Where is my...").fill("piano");
  await expect(page.getByText("Nothing found in this move")).toBeVisible();

  await page.getByRole("link", { name: /Print labels for this move/ }).click();
  const labels = page.getByTestId("label");
  await expect(labels).toHaveCount(2);
  await expect(labels.first()).toContainText("BOX 01");
  await expect(labels.first().getByRole("img")).toBeVisible();
  await expect(labels.nth(1)).toContainText("Kitchen");
});

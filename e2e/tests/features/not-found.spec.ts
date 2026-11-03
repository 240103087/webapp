// #97 E2E: unknown codes and missing pages
import { test, expect, signUp, uniqueEmail } from "../fixtures";
import { createTag } from "./helpers";

test.use({ allowHttpErrors: [404] });

test("an unknown code, an unknown page and another owner's tag fail politely (#97)", async ({ page, browser, baseURL }) => {
  await page.goto("/t/ZZZZ2222");
  await expect(page.getByRole("heading", { name: "No tag with this code" })).toBeVisible();

  await signUp(page, "Owner", uniqueEmail("owner"));
  const { id } = await createTag(page, { title: "My private notes", message: "Mine." });

  await page.goto("/no/such/page");
  await expect(page.getByRole("heading", { name: "This page does not exist" })).toBeVisible();
  await page.getByRole("link", { name: "Go to my tags" }).click();
  await expect(page.getByRole("heading", { name: "My tags" })).toBeVisible();

  // Another logged-in user cannot open the owner's tag page.
  const other = await browser.newContext({ baseURL });
  const otherPage = await other.newPage();
  await signUp(otherPage, "Stranger", uniqueEmail("stranger"));
  await otherPage.goto(`/tags/${id}`);
  await expect(otherPage.getByText("My private notes")).toHaveCount(0);
  await expect(otherPage.getByText(/not found|does not exist/i).first()).toBeVisible();
  await other.close();
});

// #96 E2E: scan counting
import { test, expect, signUp, uniqueEmail } from "../fixtures";
import { createTag, visitor } from "./helpers";

test("a visitor's scan is counted once; a reload and the owner's preview are not (#96)", async ({ page, browser, baseURL }) => {
  await signUp(page, "Madina", uniqueEmail("scans"));
  const { code } = await createTag(page, { title: "Welcome home", message: "Glad you are here." });
  const tagUrl = page.url();
  const scans = page.locator("dt", { hasText: /^Scans$/ }).locator("xpath=following-sibling::dd[1]");
  await expect(scans).toHaveText("0");

  // The owner's own preview does not count.
  await page.goto(`/t/${code}`);
  await expect(page.getByText("Glad you are here.")).toBeVisible();
  await page.goto(tagUrl);
  await expect(scans).toHaveText("0");

  const v = await visitor(browser, baseURL);
  await v.page.goto(`/t/${code}`);
  await expect(v.page.getByText("Glad you are here.")).toBeVisible();
  await v.page.reload();
  await expect(v.page.getByText("Glad you are here.")).toBeVisible();
  await v.close();

  await page.reload();
  await expect(scans).toHaveText("1");
});

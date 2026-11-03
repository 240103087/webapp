// #90 E2E: archive, unarchive and delete a tag
import { test, expect, signUp, uniqueEmail } from "../fixtures";
import { createTag, visitor } from "./helpers";

test("archive hides the tag from visitors, unarchive brings it back, delete removes it (#90)", async ({ page, browser, baseURL }) => {
  await signUp(page, "Nurlan", uniqueEmail("archive"));
  const { code } = await createTag(page, { title: "Old bike", message: "Sold it, but the memories stay." });
  const tagUrl = page.url();
  const v = await visitor(browser, baseURL);

  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText(/Archived\. Visitors who scan this QR code/)).toBeVisible();
  await v.page.goto(`/t/${code}`);
  await expect(v.page.getByRole("heading", { name: "This tag is no longer active" })).toBeVisible();
  await expect(v.page.getByText("Sold it, but the memories stay.")).toHaveCount(0);

  // Archived tags leave the main list and show under the Archived filter.
  await page.goto("/");
  await expect(page.getByRole("article").filter({ hasText: "Old bike" })).toHaveCount(0);
  await page.getByRole("button", { name: "Archived" }).click();
  await expect(page.getByRole("article").filter({ hasText: "Old bike" })).toHaveCount(1);

  await page.goto(tagUrl);
  await page.getByRole("button", { name: "Unarchive" }).click();
  await expect(page.getByRole("button", { name: "Archive" })).toBeVisible();
  await v.page.reload();
  await expect(v.page.getByText("Sold it, but the memories stay.")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: "My tags" })).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: "Old bike" })).toHaveCount(0);
  await v.page.reload();
  await expect(v.page.getByRole("heading", { name: "No tag with this code" })).toBeVisible();
  await v.close();
});

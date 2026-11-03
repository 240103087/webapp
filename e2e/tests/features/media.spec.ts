// #83 E2E: upload, caption and delete media
import { test, expect, signUp, uniqueEmail } from "../fixtures";
import { createTag, visitor, FILES } from "./helpers";

test("upload a photo and audio, caption the photo, delete the audio (#83)", async ({ page, browser, baseURL }) => {
  await signUp(page, "Madina", uniqueEmail("media"));
  const { code } = await createTag(page, { title: "Grandma's tea set", message: "From Shymkent." });

  const items = page.locator(".media-item, [data-media-id]");
  await page.locator("#media-input").setInputFiles(FILES.photo);
  await expect(items).toHaveCount(1);
  await page.locator("#media-input").setInputFiles(FILES.audio);
  await expect(items).toHaveCount(2);

  const caption = page.getByPlaceholder("Add a caption").first();
  await caption.fill("Grandma's kitchen, 2015");
  await caption.blur();
  await expect(page.getByAltText("Grandma's kitchen, 2015")).toBeVisible();

  const v = await visitor(browser, baseURL);
  await v.page.goto(`/t/${code}`);
  await expect(v.page.getByText("Grandma's kitchen, 2015")).toBeVisible();
  const img = v.page.locator("main img").first();
  await expect(img).toBeVisible();
  expect(await img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  await expect(v.page.locator("main audio")).toHaveCount(1);

  // Delete the audio on the owner's page; the visitor no longer gets it.
  await page.getByRole("button", { name: "Delete item 2" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(items).toHaveCount(1);
  await v.page.reload();
  await expect(v.page.locator("main audio")).toHaveCount(0);
  await expect(v.page.locator("main img")).toHaveCount(1);
  await v.close();
});

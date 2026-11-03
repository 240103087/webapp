// #82 E2E: create and edit a tag
import { test, expect, signUp, uniqueEmail } from "../fixtures";
import { createTag, visitor } from "./helpers";

test("create a gift, see a validation error, edit it, and the public page follows (#82)", async ({ page, browser, baseURL }) => {
  await signUp(page, "Aruzhan", uniqueEmail("editor"));

  // An empty title is refused and nothing is created.
  await page.goto("/tags/new");
  await page.getByRole("button", { name: "Create tag" }).click();
  await expect(page.getByText("Title is required")).toBeVisible();
  await expect(page).toHaveURL(/\/tags\/new/);

  const { code } = await createTag(page, { title: "A scarf for the first snow", recipient: "Madina", message: "Wear it on the first snowy day." });
  await expect(page.getByText("Wear it on the first snowy day.")).toBeVisible();

  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Title").fill("A warm scarf");
  await page.getByLabel("Message").fill("Knitted in the evenings after classes.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: "A warm scarf", exact: true })).toBeVisible();

  const v = await visitor(browser, baseURL);
  await v.page.goto(`/t/${code}`);
  await expect(v.page.getByRole("heading", { name: "A warm scarf" })).toBeVisible();
  await expect(v.page.getByText("For Madina")).toBeVisible();
  await expect(v.page.getByText("Knitted in the evenings after classes.")).toBeVisible();
  await v.close();
});

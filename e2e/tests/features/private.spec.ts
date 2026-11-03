// #88 E2E: private tag
import { test, expect, signUp, uniqueEmail } from "../fixtures";
import { createTag, visitor } from "./helpers";

test("a private tag shows visitors nothing, and the owner a preview (#88)", async ({ page, browser, baseURL, request }) => {
  await signUp(page, "Sabina", uniqueEmail("private"));
  const { code } = await createTag(page, { kind: "keepsake", title: "Letters from school years", message: "Only for me.", privacy: "Private" });

  const api = await (await request.get(`/api/public/tags/${code}`)).json();
  expect(api).toEqual({ state: "private" });

  const v = await visitor(browser, baseURL);
  await v.page.goto(`/t/${code}`);
  await expect(v.page.getByRole("heading", { name: "This tag is private" })).toBeVisible();
  await expect(v.page.getByText("Letters from school years")).toHaveCount(0);
  await expect(v.page.getByText("Only for me.")).toHaveCount(0);
  await v.close();

  // The owner, logged in, sees a preview of the full page.
  await page.goto(`/t/${code}`);
  await expect(page.getByRole("heading", { name: "Letters from school years" })).toBeVisible();
  await expect(page.getByText("Only for me.")).toBeVisible();
});

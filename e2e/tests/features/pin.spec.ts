// #85 E2E: PIN-protected gift
import { test, expect, signUp, uniqueEmail } from "../fixtures";
import { createTag, visitor } from "./helpers";

test("a PIN gift shows nothing until the right PIN, and stays open after a reload (#85)", async ({ page, browser, baseURL, request }) => {
  await signUp(page, "Mom", uniqueEmail("pin"));
  const { code } = await createTag(page, { title: "Concert tickets for two", message: "Saturday at the Philharmonic.", privacy: "PIN", pin: "2511" });

  // The server sends no title or message without the PIN.
  const api = await (await request.get(`/api/public/tags/${code}`)).json();
  expect(api.state).toBe("pinRequired");
  expect(JSON.stringify(api)).not.toContain("Concert tickets");
  expect(JSON.stringify(api)).not.toContain("Philharmonic");

  const v = await visitor(browser, baseURL, [403]);
  await v.page.goto(`/t/${code}`);
  await expect(v.page.getByRole("heading", { name: "This tag is protected" })).toBeVisible();
  await expect(v.page.getByText("Concert tickets for two")).toHaveCount(0);

  await v.page.getByLabel(/PIN/).fill("1111");
  await v.page.getByRole("button", { name: "Open" }).click();
  await expect(v.page.getByText("Wrong PIN. 4 attempts left")).toBeVisible();

  await v.page.getByLabel(/PIN/).fill("2511");
  await v.page.getByRole("button", { name: "Open" }).click();
  await expect(v.page.getByRole("heading", { name: "Concert tickets for two" })).toBeVisible();
  await expect(v.page.getByText("Saturday at the Philharmonic.")).toBeVisible();

  await v.page.reload();
  await expect(v.page.getByText("Saturday at the Philharmonic.")).toBeVisible();
  await v.close();
});

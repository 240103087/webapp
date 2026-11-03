// #87 E2E: time capsule (opens on a date)
import { test, expect, signUp, uniqueEmail } from "../fixtures";
import { createTag, visitor } from "./helpers";

test("a gift that opens on a future date shows the countdown and hides the message (#87)", async ({ page, browser, baseURL, request }) => {
  await signUp(page, "Future me", uniqueEmail("capsule"));
  const { code } = await createTag(page, {
    title: "Open on graduation day", recipient: "Future me", message: "You made it.", opensAt: "2035-06-20T10:00",
  });

  const api = await (await request.get(`/api/public/tags/${code}`)).json();
  expect(api.state).toBe("timeLocked");
  expect(api).not.toHaveProperty("tag");
  expect(JSON.stringify(api)).not.toContain("You made it.");

  const v = await visitor(browser, baseURL);
  await v.page.goto(`/t/${code}`);
  await expect(v.page.getByRole("heading", { name: "Open on graduation day" })).toBeVisible();
  await expect(v.page.getByText("This capsule opens on")).toBeVisible();
  await expect(v.page.locator(".countdown-cells .cd-cell")).toHaveCount(4);
  await expect(v.page.getByText("You made it.")).toHaveCount(0);
  await expect(v.page.getByRole("button", { name: "Send" })).toHaveCount(0);
  await v.close();
});

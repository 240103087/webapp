import { test, expect } from "./fixtures";

test("a time-locked gift shows the countdown and hides the message", async ({ page, request }) => {
  // Demo gift "Happy 30th, Dana" opens on a date in the future.
  const api = await (await request.get("/api/public/tags/P4XH9M3K")).json();
  expect(api.state).toBe("timeLocked");
  expect(api).not.toHaveProperty("tag");

  await page.goto("/t/P4XH9M3K");
  await expect(page.getByRole("heading", { name: "Happy 30th, Dana" })).toBeVisible();
  await expect(page.locator(".countdown-cells .cd-cell")).toHaveCount(4);
  await expect(page.getByText(/days, \d+ hours and \d+ minutes left/)).toBeAttached();
  await expect(page.getByText("This capsule opens on")).toBeVisible();
  await expect(page.locator("main img")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Send" })).toHaveCount(0);
});

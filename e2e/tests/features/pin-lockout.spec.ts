// #86 E2E: PIN lockout after 5 wrong attempts
import { test, expect, signUp, uniqueEmail } from "../fixtures";
import { createTag, visitor } from "./helpers";

test("five wrong PINs lock the gift, and even the right PIN is refused while locked (#86)", async ({ page, browser, baseURL, request }) => {
  await signUp(page, "Erlan", uniqueEmail("lock"));
  const { code } = await createTag(page, { title: "Birthday watch", message: "Happy birthday!", privacy: "PIN", pin: "4321" });

  const v = await visitor(browser, baseURL, [403, 423]);
  await v.page.goto(`/t/${code}`);
  const pin = v.page.getByLabel(/PIN/);
  for (let left = 4; left >= 1; left--) {
    await pin.fill("0000");
    await v.page.getByRole("button", { name: "Open" }).click();
    await expect(v.page.getByText(`Wrong PIN. ${left} ${left === 1 ? "attempt" : "attempts"} left`)).toBeVisible();
  }
  await pin.fill("0000");
  await v.page.getByRole("button", { name: "Open" }).click();
  await expect(v.page.getByText(/Too many attempts/)).toBeVisible();
  await expect(pin).toBeDisabled();

  // The same visitor (same visitor id) is refused even with the right PIN.
  const visitorId = await v.page.evaluate(() => Object.entries(localStorage).find(([k]) => /visitor/i.test(k))?.[1] ?? "");
  const res = await request.post(`/api/public/tags/${code}/unlock`, { data: { pin: "4321" }, headers: visitorId ? { "x-visitor-id": visitorId } : {} });
  expect(res.status()).toBe(423);
  await v.close();
});

import { test, expect, signUp, uniqueEmail, PHOTO } from "./fixtures";

test.use({ allowHttpErrors: [403] }); // the wrong PIN below

test("owner makes a PIN gift with a photo; a visitor unlocks it and replies; the owner sees the reply", async ({ page, browser, baseURL }) => {
  const email = uniqueEmail("gift");
  await signUp(page, "Asel", email);

  // Owner: a gift with a photo, a PIN and replies on.
  await page.getByRole("link", { name: "New tag" }).click();
  await page.getByLabel("Title").fill("For mom, with love");
  await page.getByLabel("For whom (optional)").fill("Mom");
  await page.getByLabel("Message").fill("Thank you for everything.");
  await page.locator("label.radio-card", { hasText: "PIN" }).click();
  await page.getByLabel("PIN", { exact: true }).fill("2580");
  const replies = page.getByRole("switch", { name: "Allow replies" });
  if (!(await replies.isChecked())) await replies.check();
  await page.getByRole("button", { name: "Create tag" }).click();
  await expect(page.getByRole("heading", { name: "For mom, with love" })).toBeVisible();

  await page.locator("#media-input").setInputFiles(PHOTO);
  await expect(page.locator(".media-item, [data-media-id]")).toHaveCount(1);

  const qr = page.getByRole("region", { name: "QR code" });
  await expect(qr.getByTestId("qr")).toBeVisible();
  const code = (await qr.locator(".qr-code").innerText()).replace(/\s+/g, "");
  expect(code).toMatch(/^[2-9A-Z]{8}$/);
  await expect(qr.locator(".qr-url")).toHaveText(new RegExp(`/t/${code}$`));

  // Visitor: a separate browser with no session.
  const visitorContext = await browser.newContext({ baseURL });
  const visitor = await visitorContext.newPage();
  const visitorErrors: string[] = [];
  visitor.on("console", (m) => m.type() === "error" && !/status of 403/.test(m.text()) && visitorErrors.push(m.text()));
  await visitor.goto(`/t/${code}`);
  // Before the PIN nothing about the gift is shown, not even its title.
  await expect(visitor.getByRole("heading", { name: "This tag is protected" })).toBeVisible();
  await expect(visitor.getByText("For mom, with love")).toHaveCount(0);

  await visitor.getByLabel(/PIN/).fill("1111");
  await visitor.getByRole("button", { name: "Open" }).click();
  await expect(visitor.getByText("Wrong PIN. 4 attempts left")).toBeVisible();

  await visitor.getByLabel(/PIN/).fill("2580");
  await visitor.getByRole("button", { name: "Open" }).click();
  await expect(visitor.getByRole("heading", { name: "For mom, with love" })).toBeVisible();
  await expect(visitor.getByText("Thank you for everything.")).toBeVisible();
  const photo = visitor.locator("main img").first();
  await expect(photo).toBeVisible();
  expect(await photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

  await visitor.getByLabel("Your name").fill("Mom");
  await visitor.getByLabel("Message").fill("I cried. Thank you!");
  await visitor.getByRole("button", { name: "Send" }).click();
  await expect(visitor.getByText("Thank you! Your reply was sent.")).toBeVisible();
  expect(visitorErrors).toEqual([]);
  await visitorContext.close();

  // Owner: the reply shows as new on the dashboard and on the tag.
  await page.goto("/");
  const card = page.getByRole("article").filter({ hasText: "For mom, with love" });
  await expect(card.getByText("1 new")).toBeVisible();
  await card.getByRole("link", { name: "For mom, with love" }).click();
  await expect(page.getByText("I cried. Thank you!")).toBeVisible();
});

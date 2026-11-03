// #89 E2E: visitor replies
import { test, expect, signUp, uniqueEmail } from "../fixtures";
import { createTag, visitor } from "./helpers";

test("a visitor replies, the owner sees it as new and deletes it (#89)", async ({ page, browser, baseURL }) => {
  await signUp(page, "Aigul", uniqueEmail("replies"));
  const { code } = await createTag(page, { title: "A scarf for Madina", message: "Happy birthday!", replies: true });

  const v = await visitor(browser, baseURL);
  await v.page.goto(`/t/${code}`);
  await v.page.getByLabel("Your name").fill("Madina");
  await v.page.getByLabel("Message").fill("I love it, thank you!");
  await v.page.getByRole("button", { name: "Send" }).click();
  await expect(v.page.getByText("Thank you! Your reply was sent.")).toBeVisible();
  await v.close();

  await page.goto("/");
  await expect(page.getByRole("region", { name: "Summary" })).toContainText("1Unread replies");
  const card = page.getByRole("article").filter({ hasText: "A scarf for Madina" });
  await expect(card.getByText("1 new")).toBeVisible();
  await card.getByRole("link", { name: "A scarf for Madina" }).click();
  await expect(page.getByText("I love it, thank you!")).toBeVisible();

  await page.getByRole("button", { name: "Delete reply from Madina" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("I love it, thank you!")).toHaveCount(0);
  await expect(page.getByText("No replies yet.")).toBeVisible();
});

test("with replies switched off the public page has no reply form (#89)", async ({ page, browser, baseURL }) => {
  await signUp(page, "Aigul", uniqueEmail("noreplies"));
  const { code } = await createTag(page, { title: "Quiet gift", message: "No replies please.", replies: false });
  const v = await visitor(browser, baseURL);
  await v.page.goto(`/t/${code}`);
  await expect(v.page.getByText("No replies please.")).toBeVisible();
  await expect(v.page.getByRole("button", { name: "Send" })).toHaveCount(0);
  await v.close();
});

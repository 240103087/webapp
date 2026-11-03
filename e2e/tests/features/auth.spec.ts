// #81 E2E: sign up, log out and log in
import { test, expect, signUp, uniqueEmail } from "../fixtures";

test.use({ allowHttpErrors: [401] }); // the wrong password below

test("sign up, log out, wrong password, log in again (#81)", async ({ page }) => {
  const email = uniqueEmail("auth");
  await signUp(page, "Dana", email);

  // On a phone the user menu sits behind the hamburger button.
  const burger = page.getByRole("button", { name: "Open menu" });
  if (await burger.isVisible()) await burger.click();
  await page.getByRole("button", { name: /Dana/ }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);

  // Owner pages need a session.
  await page.goto("/moves");
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Email or password is wrong")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Log in" }).click();
  // Back to the page that asked for the log-in.
  await expect(page).toHaveURL(/\/moves$/);
  await expect(page.getByRole("heading", { name: "Moves", exact: true })).toBeVisible();
});

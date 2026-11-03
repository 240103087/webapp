// #92 E2E: create, edit and delete a move
import { test, expect, signUp, uniqueEmail } from "../fixtures";
import { addBox, createMove } from "./helpers";

test("create, rename and delete an empty move; a move with boxes cannot be deleted (#92)", async ({ page }) => {
  await signUp(page, "Timur", uniqueEmail("moves"));
  const url = await createMove(page, "Summer at the dacha", "Almaty", "Talgar");
  await expect(page.getByText("No boxes yet")).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Name").fill("Weekend at the dacha");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Weekend at the dacha", exact: true })).toBeVisible();

  await page.goto("/moves");
  await expect(page.getByRole("link", { name: /Weekend at the dacha/ })).toBeVisible();

  await page.goto(url);
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete move" }).click();
  await expect(page).toHaveURL(/\/moves$/);
  await expect(page.getByRole("link", { name: /Weekend at the dacha/ })).toHaveCount(0);

  // A move with a box refuses to be deleted, so nothing is lost by accident.
  const full = await createMove(page, "Dorm to flat");
  await addBox(page, full, { title: "Books", room: "Bedroom", items: ["Textbooks"] });
  await page.goto(full);
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Move the boxes to another move or delete them first")).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
});

// #95 E2E: print labels in three sizes
import { test, expect, signUp, uniqueEmail } from "../fixtures";
import { addBox, createMove, createTag } from "./helpers";

test("labels for a move in sizes S, M and L, and labels for tags picked by hand (#95)", async ({ page }) => {
  await signUp(page, "Erlan", uniqueEmail("print"));
  const move = await createMove(page, "Dorm to flat");
  await addBox(page, move, { title: "Kitchen essentials", room: "Kitchen", items: ["Kettle"], fragile: true });
  await addBox(page, move, { title: "Study corner", room: "Bedroom", items: ["Charger"] });
  await addBox(page, move, { title: "Clothes", room: "Bedroom", items: ["Coat"] });
  await createTag(page, { title: "Birthday scarf", message: "For Madina." });

  await page.goto(move);
  await page.getByRole("link", { name: /Print labels for this move/ }).click();
  const labels = page.getByTestId("label");
  const sheets = page.getByTestId("sheet");
  await expect(labels).toHaveCount(3);
  await expect(labels.first()).toContainText("BOX 01");
  await expect(labels.first()).toContainText("Kitchen");
  await expect(labels.first()).toContainText("FRAGILE");
  await expect(labels.first().getByRole("img")).toBeVisible();

  await page.getByRole("radio", { name: "S", exact: true }).check();
  await expect(page.getByText("15 per A4 page")).toBeVisible();
  await expect(sheets).toHaveCount(1);
  await page.getByRole("radio", { name: "M", exact: true }).check();
  await expect(page.getByText("6 per A4 page")).toBeVisible();
  await expect(sheets).toHaveCount(1);
  await page.getByRole("radio", { name: "L", exact: true }).check();
  await expect(page.getByText("2 per A4 page")).toBeVisible();
  await expect(sheets).toHaveCount(2);

  // Picking by hand prints only what was picked.
  await page.goto("/print");
  await expect(page.getByText("Pick a move or some tags to print.")).toBeVisible();
  await page.getByRole("checkbox", { name: /Birthday scarf/ }).check();
  await expect(labels).toHaveCount(1);
  await expect(labels.first()).toContainText("Birthday scarf");
});

// #93 E2E: boxes with numbers, rooms, contents and fragile
import { test, expect, signUp, uniqueEmail } from "../fixtures";
import { addBox, createMove, visitor } from "./helpers";

test("boxes are numbered in order, grouped by room, and their page shows what is inside (#93)", async ({ page, browser, baseURL }) => {
  await signUp(page, "Aruzhan", uniqueEmail("boxes"));
  const move = await createMove(page, "Dorm to flat");
  const kitchen = await addBox(page, move, { title: "Kitchen essentials", room: "Kitchen", items: ["Electric kettle", "Two mugs", "Frying pan"], fragile: true });
  await expect(page.getByText("BOX 01").first()).toBeVisible();
  await addBox(page, move, { title: "Study corner", room: "Bedroom", items: ["Laptop charger", "Desk lamp"] });
  await expect(page.getByText("BOX 02").first()).toBeVisible();
  await addBox(page, move, { title: "Clothes", room: "Bedroom", items: ["Winter coat"] });
  await expect(page.getByText("BOX 03").first()).toBeVisible();

  await page.goto(move);
  await expect(page.getByText("3 boxes")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Bedroom · 2/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Kitchen · 1/ })).toBeVisible();

  // A friend scans the kitchen box at the new flat.
  const v = await visitor(browser, baseURL);
  await v.page.goto(`/t/${kitchen}`);
  await expect(v.page.getByRole("heading", { name: "Kitchen essentials" })).toBeVisible();
  await expect(v.page.getByText("BOX 01").first()).toBeVisible();
  await expect(v.page.getByText("Kitchen").first()).toBeVisible();
  await expect(v.page.getByText("FRAGILE · Handle with care")).toBeVisible();
  await expect(v.page.getByRole("heading", { name: "Inside this box" })).toBeVisible();
  await expect(v.page.locator(".contents-list li")).toHaveText(["Electric kettle", "Two mugs", "Frying pan"]);
  await v.close();
});

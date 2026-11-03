// #94 E2E: "Where is my..." search in a move
import { test, expect, signUp, uniqueEmail } from "../fixtures";
import { addBox, createMove } from "./helpers";

test("the move search finds the box with the item, by word, any case, or by room (#94)", async ({ page }) => {
  await signUp(page, "Dana", uniqueEmail("search"));
  const move = await createMove(page, "Almaty to Astana");
  await addBox(page, move, { title: "Kitchen essentials", room: "Kitchen", items: ["Electric kettle", "Two mugs"] });
  await addBox(page, move, { title: "Study corner", room: "Bedroom", items: ["Laptop charger", "Passport and student ID"] });
  await page.goto(move);

  const search = page.getByLabel("Where is my...");
  const hits = page.locator(".hits");

  await search.fill("KETTLE");
  await expect(hits.getByRole("link")).toHaveCount(1);
  await expect(hits).toContainText("BOX 01");
  await expect(hits).toContainText("Kitchen");
  await expect(hits.locator("mark")).toHaveText(["kettle"]);

  await search.fill("passport");
  await expect(hits.getByRole("link")).toHaveCount(1);
  await expect(hits).toContainText("BOX 02");

  await search.fill("bedroom");
  await expect(hits.getByRole("link")).toHaveCount(1);
  await expect(hits).toContainText("Study corner");

  await search.fill("piano");
  await expect(page.getByText("Nothing found in this move")).toBeVisible();
});

// #91 E2E: dashboard counters, search and filters
import { test, expect, signUp, uniqueEmail } from "../fixtures";
import { addBox, createMove, createTag } from "./helpers";

test("the dashboard counts tags, searches by title and filters by kind (#91)", async ({ page }) => {
  await signUp(page, "Asel", uniqueEmail("dash"));
  await createTag(page, { title: "Birthday scarf", message: "For Madina." });
  await createTag(page, { kind: "keepsake", title: "Grandma's tea set", message: "From Shymkent." });
  const move = await createMove(page, "Dorm to flat");
  await addBox(page, move, { title: "Kitchen essentials", room: "Kitchen", items: ["Kettle"] });

  await page.goto("/");
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(3);
  await expect(page.getByRole("region", { name: "Summary" })).toContainText("3Tags");

  await page.getByPlaceholder("Search by title").fill("tea");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Grandma's tea set");
  await page.getByPlaceholder("Search by title").fill("piano");
  await expect(page.getByText("No tags match")).toBeVisible();
  await page.getByPlaceholder("Search by title").fill("");

  const kind = page.getByRole("group", { name: "Kind" });
  await kind.getByRole("button", { name: "Gifts" }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Birthday scarf");
  await kind.getByRole("button", { name: "Boxes" }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Kitchen essentials");
  await kind.getByRole("button", { name: "Keepsakes" }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Grandma's tea set");
  await kind.getByRole("button", { name: "All" }).click();
  await expect(cards).toHaveCount(3);
});

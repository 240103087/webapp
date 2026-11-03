// #84 E2E: QR code panel
import { readFile } from "node:fs/promises";
import { test, expect, signUp, uniqueEmail } from "../fixtures";
import { createTag } from "./helpers";

test("the QR panel shows the code and link, downloads PNG and SVG, and the link opens the tag (#84)", async ({ page }) => {
  await signUp(page, "Timur", uniqueEmail("qr"));
  const { code } = await createTag(page, { title: "Keys to the new flat", message: "Welcome home." });
  expect(code).toMatch(/^[2-9A-Z]{8}$/);

  const qr = page.getByRole("region", { name: "QR code" });
  await expect(qr.getByTestId("qr")).toBeVisible();
  await expect(qr.locator(".qr-url")).toHaveText(new RegExp(`/t/${code}$`));

  const [png] = await Promise.all([page.waitForEvent("download"), qr.getByRole("button", { name: "PNG" }).click()]);
  expect(png.suggestedFilename()).toBe(`moveeasy-${code}.png`);
  const pngBytes = await readFile(await png.path());
  expect(pngBytes.subarray(1, 4).toString()).toBe("PNG");

  const [svg] = await Promise.all([page.waitForEvent("download"), qr.getByRole("button", { name: "SVG" }).click()]);
  expect(svg.suggestedFilename()).toBe(`moveeasy-${code}.svg`);
  expect((await readFile(await svg.path(), "utf8"))).toContain("<svg");

  const [tab] = await Promise.all([page.context().waitForEvent("page"), qr.getByRole("link", { name: "Open" }).click()]);
  await expect(tab).toHaveURL(new RegExp(`/t/${code}$`));
  await expect(tab.getByRole("heading", { name: "Keys to the new flat" })).toBeVisible();
});

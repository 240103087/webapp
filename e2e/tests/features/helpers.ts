import type { Browser, Page } from "@playwright/test";
import { expect } from "../fixtures";

/** Demo files shipped with the frontend, reused as uploads. */
export const FILES = {
  photo: new URL("../../../frontend/public/demo/cake.jpg", import.meta.url).pathname,
  audio: new URL("../../../frontend/public/demo/voice-hello.ogg", import.meta.url).pathname,
};

export interface NewTag {
  kind?: "gift" | "box" | "keepsake";
  title: string;
  recipient?: string;
  message?: string;
  privacy?: "Public" | "PIN" | "Private";
  pin?: string;
  replies?: boolean;
  /** Value for the datetime-local field, e.g. "2030-01-01T10:00". */
  opensAt?: string;
}

/** Creates a tag through the editor and returns its id and public code (from the QR panel). */
export async function createTag(page: Page, t: NewTag): Promise<{ id: string; code: string }> {
  await page.goto("/tags/new");
  if (t.kind && t.kind !== "gift") await page.locator(`input[name="kind"][value="${t.kind}"]`).check({ force: true });
  await page.getByLabel("Title").fill(t.title);
  if (t.recipient) await page.getByLabel("For whom (optional)").fill(t.recipient);
  if (t.message) await page.getByLabel("Message").fill(t.message);
  if (t.privacy && t.privacy !== "Public") await page.locator("label.radio-card", { hasText: t.privacy }).click();
  if (t.pin) await page.getByLabel("PIN", { exact: true }).fill(t.pin);
  if (t.opensAt) {
    await page.getByRole("switch", { name: "Open on a date (time capsule)" }).check();
    await page.getByLabel("Opens on").fill(t.opensAt);
  }
  if (t.replies !== undefined) {
    const sw = page.getByRole("switch", { name: "Allow replies" });
    if ((await sw.isChecked()) !== t.replies) await sw.click();
  }
  await page.getByRole("button", { name: "Create tag" }).click();
  await expect(page.getByRole("heading", { name: t.title, exact: true })).toBeVisible();
  const id = new URL(page.url()).pathname.split("/").pop()!;
  return { id, code: await codeOnTagPage(page) };
}

export async function codeOnTagPage(page: Page): Promise<string> {
  const qr = page.getByRole("region", { name: "QR code" });
  await expect(qr.locator(".qr-code")).toBeVisible();
  return (await qr.locator(".qr-code").innerText()).replace(/\s+/g, "");
}

/**
 * A visitor: a separate browser context with no session. Page errors and console errors fail the
 * test, except HTTP statuses listed in `allow` (a wrong PIN is a 403, a lock a 423).
 */
export async function visitor(browser: Browser, baseURL: string | undefined, allow: number[] = []) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const http = /status of (\d+)/.exec(m.text());
    if (http && allow.includes(Number(http[1]))) return;
    errors.push(m.text());
  });
  return {
    page,
    async close() {
      await context.close();
      expect(errors, "visitor console errors").toEqual([]);
    },
  };
}

/** Creates a move from the Moves page and returns its URL. */
export async function createMove(page: Page, name: string, from?: string, to?: string): Promise<string> {
  await page.goto("/moves");
  await page.getByRole("button", { name: "New move" }).click();
  await page.getByLabel("Name").fill(name);
  if (from) await page.getByLabel("From (optional)").fill(from);
  if (to) await page.getByLabel("To (optional)").fill(to);
  await page.getByRole("button", { name: "Create move" }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  return page.url();
}

export interface NewBox { title: string; room: string; items: string[]; fragile?: boolean }

/**
 * Adds a box from the move page. The items are pasted into the first row as one block of lines,
 * the way a person pastes a list. Returns the box's public code.
 */
export async function addBox(page: Page, moveUrl: string, b: NewBox): Promise<string> {
  await page.goto(moveUrl);
  await page.getByRole("link", { name: "Add box" }).first().click();
  await page.getByLabel("Title").fill(b.title);
  await page.getByLabel("Room").fill(b.room);
  const first = page.getByLabel("Item 1", { exact: true });
  if (b.items.length === 1) await first.fill(b.items[0]);
  else await first.evaluate((el, text) => {
    const data = new DataTransfer();
    data.setData("text/plain", text);
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }, b.items.join("\n"));
  await expect(page.getByLabel(`Item ${b.items.length}`, { exact: true })).toHaveValue(b.items.at(-1)!);
  if (b.fragile) await page.getByRole("switch", { name: "Fragile" }).check();
  await page.getByRole("button", { name: "Create tag" }).click();
  await expect(page.getByRole("heading", { name: b.title, exact: true })).toBeVisible();
  return codeOnTagPage(page);
}

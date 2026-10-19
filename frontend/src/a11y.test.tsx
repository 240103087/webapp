import { screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { api } from "./api";
import { THEME_INFO } from "./components/PrivacyFields";
import { loginAs, renderApp } from "./test/render";

/** WCAG relative luminance and contrast ratio. */
function lum(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
/** Text drawn with `opacity` over a background, as one solid color. */
function blend(fg: string, bg: string, opacity: number) {
  const c = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  return "#" + [1, 3, 5].map((i) => Math.round(c(fg, i) * opacity + c(bg, i) * (1 - opacity)).toString(16).padStart(2, "0")).join("");
}

/** Every visible form control must have an accessible name from a label (or aria-label). */
function expectAllLabelled() {
  const controls = Array.from(document.querySelectorAll<HTMLElement>("input:not([type=hidden]):not([hidden]), select, textarea"));
  expect(controls.length).toBeGreaterThan(0);
  for (const el of controls) {
    const labelled = (el as HTMLInputElement).labels?.length || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
    expect(labelled, `${el.outerHTML.slice(0, 80)} has no label`).toBeTruthy();
  }
}

describe("accessibility (#21)", () => {
  it("public themes: text and the faded footer text have at least 4.5:1 contrast", () => {
    for (const [name, t] of Object.entries(THEME_INFO)) {
      expect(contrast(t.ink, t.bg), name).toBeGreaterThanOrEqual(4.5);
      expect(contrast(blend(t.ink, t.bg, 0.85), t.bg), `${name} footer`).toBeGreaterThanOrEqual(4.5);
    }
  });

  describe("every input has a label", () => {
    beforeEach(async () => {
      await loginAs();
    });
    const pages: [string, string][] = [
      ["/", "Keys to your first home"],
      ["/tags/new", "New tag"],
      ["/tags/t_box7/edit", "Edit “Kitchen everyday”"],
      ["/tags/t_keys", "Keys to your first home"],
      ["/moves/m_astana", "Almaty → Astana"],
      ["/print?move=m_astana", "Print labels"],
    ];
    for (const [path, heading] of pages) {
      it(path, async () => {
        renderApp(path);
        await screen.findByRole("heading", { name: heading });
        expectAllLabelled();
      });
    }
    it("login, PIN form and reply form", async () => {
      await api.logOut();
      const { router } = renderApp("/login");
      await screen.findByRole("heading", { name: "Log in" });
      expectAllLabelled();
      await router.navigate("/t/D8RW5TQN");
      await screen.findByLabelText(/PIN/);
      expectAllLabelled();
      await router.navigate("/t/7KQ4M2XP");
      await screen.findByLabelText("Your name");
      expectAllLabelled();
    });
  });
});

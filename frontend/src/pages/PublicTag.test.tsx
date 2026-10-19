import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../api";
import { loginAs, renderApp } from "../test/render";

beforeEach(async () => {
  await api.resetDemo!();
});

describe("public page, open tag", () => {
  it("shows a gift with message, photos, audio and video", async () => {
    renderApp("/t/7kq4-m2xp");
    expect(await screen.findByRole("heading", { name: "Keys to your first home" })).toBeInTheDocument();
    expect(screen.getByText("For Aruzhan")).toBeInTheDocument();
    expect(screen.getByText(/These are the keys/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "The keys, finally" })).toBeInTheDocument();
    expect(screen.getByLabelText("From Ata").tagName).toBe("AUDIO");
    expect(screen.getByLabelText("Everyone says hi").tagName).toBe("VIDEO");
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Made with MoveEasy" })).toHaveAttribute("href", "/");
  });

  it("opens photos full screen, next, and Escape closes", async () => {
    renderApp("/t/7KQ4M2XP");
    await userEvent.click(await screen.findByRole("button", { name: /Open photo 1 of 2/ }));
    const dialog = screen.getByRole("dialog", { name: "Photo 1 of 2" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Next photo" }));
    expect(screen.getByRole("dialog", { name: "Photo 2 of 2" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a box with number, room, fragile and contents", async () => {
    renderApp("/t/M5ZT3XCG");
    expect(await screen.findByText("BOX 07")).toBeInTheDocument();
    expect(screen.getByText("Kitchen")).toBeInTheDocument();
    expect(screen.getByText(/FRAGILE/)).toBeInTheDocument();
    expect(screen.getByText("Electric kettle")).toBeInTheDocument();
    expect(screen.getByText("Almaty → Astana")).toBeInTheDocument();
  });

  it("shows the owner a preview banner", async () => {
    await loginAs();
    renderApp("/t/S6ZE3VKA");
    expect(await screen.findByRole("note")).toHaveTextContent("Preview. Visitors see this page.");
    expect(screen.getByRole("heading", { name: "Family album 1985-1999" })).toBeInTheDocument();
  });

  it("keeps line breaks as text, not HTML", async () => {
    await loginAs();
    const t = await api.createTag({ kind: "gift", title: "<b>x</b>", message: "<img src=x onerror=alert(1)>\nline" });
    await api.logOut();
    renderApp(`/t/${t.code}`);
    expect(await screen.findByRole("heading", { name: "<b>x</b>" })).toBeInTheDocument();
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument();
  });
});

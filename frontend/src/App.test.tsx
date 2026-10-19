import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, beforeEach } from "vitest";
import { loginAs, renderApp } from "./test/render";

beforeEach(async () => {
  await loginAs();
});

it("shows the top bar and navigates between sections", async () => {
  renderApp("/");
  expect(await screen.findByRole("link", { name: "MoveEasy home" })).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Tags" })).toHaveAttribute("aria-current", "page");
  await userEvent.click(screen.getByRole("link", { name: "Moves" }));
  expect(await screen.findByRole("heading", { name: "Moves" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Moves" })).toHaveAttribute("aria-current", "page");
  expect(document.title).toBe("Moves · MoveEasy");
});

it("shows a 404 for unknown routes", async () => {
  renderApp("/nope");
  expect(await screen.findByRole("heading", { name: "This page does not exist" })).toBeInTheDocument();
});

it("has no app chrome on the public tag page", async () => {
  renderApp("/t/7KQ4M2XP");
  expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
});

it("menu button toggles the nav on phones", async () => {
  renderApp("/");
  const btn = await screen.findByRole("button", { name: "Open menu" });
  expect(btn).toHaveAttribute("aria-expanded", "false");
  await userEvent.click(btn);
  expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
});

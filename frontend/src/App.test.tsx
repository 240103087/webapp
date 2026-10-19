import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { it, expect } from "vitest";
import { AppRoutes } from "./routes";
import { ToastProvider } from "./ui/Toast";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </MemoryRouter>,
  );
}

it("shows the top bar and navigates between sections", async () => {
  renderAt("/");
  expect(screen.getByRole("link", { name: "MoveEasy home" })).toBeInTheDocument();
  const nav = screen.getByRole("navigation", { name: "Main" });
  expect(nav).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Tags" })).toHaveAttribute("aria-current", "page");
  await userEvent.click(screen.getByRole("link", { name: "Moves" }));
  expect(screen.getByRole("heading", { name: "Moves" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Moves" })).toHaveAttribute("aria-current", "page");
  expect(document.title).toBe("Moves · MoveEasy");
});

it("shows a 404 for unknown routes", () => {
  renderAt("/nope");
  expect(screen.getByRole("heading", { name: "This page does not exist" })).toBeInTheDocument();
});

it("has no app chrome on the public tag page", () => {
  renderAt("/t/7KQ4M2XP");
  expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
});

it("menu button toggles the nav on phones", async () => {
  renderAt("/");
  const btn = screen.getByRole("button", { name: "Open menu" });
  expect(btn).toHaveAttribute("aria-expanded", "false");
  await userEvent.click(btn);
  expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
});

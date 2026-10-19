import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../api";
import { loginAs, renderApp } from "../test/render";

beforeEach(async () => {
  await loginAs();
});

describe("moves", () => {
  it("lists moves with box counts", async () => {
    renderApp("/moves");
    expect(await screen.findByText("Almaty → Astana")).toBeInTheDocument();
    expect(screen.getByText("12 boxes")).toBeInTheDocument();
    expect(screen.getByText("0 boxes")).toBeInTheDocument();
  });

  it("creates a move and opens it", async () => {
    renderApp("/moves");
    await userEvent.click(await screen.findByRole("button", { name: "New move" }));
    await userEvent.click(screen.getByRole("button", { name: "Create move" }));
    expect(screen.getByText("Name is required")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Name"), "To Shymkent");
    await userEvent.click(screen.getByRole("button", { name: "Create move" }));
    expect(await screen.findByRole("heading", { name: "To Shymkent" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No boxes yet" })).toBeInTheDocument();
  });

  it("subtitle has no stray separator (#58)", async () => {
    const { router } = renderApp("/moves");
    await userEvent.click(await screen.findByRole("button", { name: "New move" }));
    await userEvent.type(screen.getByLabelText("Name"), "Only a name");
    await userEvent.click(screen.getByRole("button", { name: "Create move" }));
    const h1 = await screen.findByRole("heading", { level: 1, name: "Only a name" });
    expect(h1.nextElementSibling).toHaveTextContent(/^0 boxes$/);
    await router.navigate("/moves/m_astana");
    const h2 = await screen.findByRole("heading", { level: 1, name: "Almaty → Astana" });
    expect(h2.nextElementSibling?.textContent).toMatch(/^Abay Ave 52, Almaty → Kabanbay Batyr 11, Astana · .+ · 12 boxes$/);
  });

  it("groups boxes by room, sorted", async () => {
    renderApp("/moves/m_astana");
    await screen.findByRole("heading", { name: "Almaty → Astana" });
    const rooms = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(rooms).toEqual(["Bathroom · 1", "Bedroom · 2", "Hallway · 1", "Kids room · 1", "Kitchen · 4", "Living room · 2", "Office · 1"]);
    const kitchen = screen.getByRole("region", { name: /Kitchen/ });
    expect(within(kitchen).getAllByText(/^BOX/).map((b) => b.textContent)).toEqual(["BOX 01", "BOX 02", "BOX 07", "BOX 09"]);
    expect(screen.getByRole("link", { name: "Add box" })).toHaveAttribute("href", "/tags/new?kind=box&move=m_astana");
    expect(screen.getByRole("link", { name: "Print labels for this move" })).toHaveAttribute("href", "/print?move=m_astana");
  });

  it("refuses to delete a move with boxes, deletes an empty one", async () => {
    const { router } = renderApp("/moves/m_astana");
    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Move the boxes to another move or delete them first");
    await router.navigate("/moves/m_dacha");
    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete move" }));
    expect(await screen.findByRole("heading", { name: "Moves" })).toBeInTheDocument();
    expect((await api.listMoves()).map((m) => m.id)).toEqual(["m_astana"]);
  });
});

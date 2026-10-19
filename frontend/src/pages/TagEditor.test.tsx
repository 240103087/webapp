import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../api";
import { loginAs, renderApp } from "../test/render";

beforeEach(async () => {
  await loginAs();
});

describe("tag editor", () => {
  it("creates a gift and opens its page", async () => {
    const { router } = renderApp("/tags/new");
    await userEvent.type(await screen.findByLabelText("Title"), "Graduation watch");
    await userEvent.type(screen.getByLabelText("For whom (optional)"), "Arman");
    await userEvent.type(screen.getByLabelText("Message"), "Line one{enter}Line two");
    await userEvent.click(screen.getByRole("button", { name: "Create tag" }));
    expect(await screen.findByRole("heading", { name: "Graduation watch" })).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(/^\/tags\/t_/);
    expect(screen.getByText(/Line one\s+Line two/)).toBeInTheDocument();
  });

  it("creates a box with contents and gets the next number", async () => {
    renderApp("/tags/new?kind=box&move=m_astana");
    await userEvent.type(await screen.findByLabelText("Title"), "Spices");
    await userEvent.type(screen.getByLabelText("Room"), "Kitchen");
    const first = screen.getByLabelText("Item 1");
    await userEvent.type(first, "Cumin{enter}");
    await userEvent.type(screen.getByLabelText("Item 2"), "Black pepper");
    await userEvent.click(screen.getByRole("switch", { name: "Fragile" }));
    await userEvent.click(screen.getByRole("button", { name: "Create tag" }));
    expect(await screen.findByRole("heading", { name: "Spices" })).toBeInTheDocument();
    expect(screen.getByText("BOX 13")).toBeInTheDocument();
    expect(screen.getByText("Black pepper")).toBeInTheDocument();
    expect(screen.getByText("FRAGILE")).toBeInTheDocument();
  });

  it("splits a pasted list into rows", async () => {
    renderApp("/tags/new?kind=box&move=m_astana");
    await userEvent.click(await screen.findByLabelText("Item 1"));
    await userEvent.paste("Kettle\nMugs\nTea");
    expect(screen.getByLabelText("Item 3")).toHaveValue("Tea");
  });

  it("shows errors under fields and focuses the first", async () => {
    renderApp("/tags/new?kind=box");
    await screen.findByLabelText("Title");
    await userEvent.click(screen.getByRole("button", { name: "Create tag" }));
    expect(screen.getByText("Title is required")).toBeInTheDocument();
    expect(screen.getByText("Choose a move for this box")).toBeInTheDocument();
    expect(screen.getByText("Room is required for a box")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveFocus();
  });

  it("keeps the title when switching kind", async () => {
    renderApp("/tags/new");
    await userEvent.type(await screen.findByLabelText("Title"), "Something");
    await userEvent.click(screen.getByRole("radio", { name: "Keepsake" }));
    await userEvent.click(screen.getByRole("radio", { name: "Box" }));
    expect(screen.getByLabelText("Title")).toHaveValue("Something");
    expect(screen.getByLabelText("Room")).toBeInTheDocument();
  });

  it("edits a tag and cancel leaves it unchanged", async () => {
    renderApp("/tags/t_keys/edit");
    const title = await screen.findByLabelText("Title");
    expect(title).toHaveValue("Keys to your first home");
    await userEvent.clear(title);
    await userEvent.type(title, "New keys");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("heading", { name: "New keys" })).toBeInTheDocument();
    expect((await api.getTag("t_keys")).title).toBe("New keys");
  });

  it("asks before leaving with unsaved changes", async () => {
    renderApp("/tags/new");
    await userEvent.type(await screen.findByLabelText("Title"), "Draft");
    await userEvent.click(screen.getByRole("link", { name: "Moves" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Leave without saving?")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.getByLabelText("Title")).toHaveValue("Draft");
    await userEvent.click(screen.getByRole("link", { name: "Moves" }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Leave" }));
    expect(await screen.findByRole("heading", { name: "Moves" })).toBeInTheDocument();
  });

  it("creates a move inline when there is none", async () => {
    await api.logOut();
    await api.signUp({ name: "N", email: "n@example.com", password: "password1" });
    renderApp("/tags/new?kind=box");
    expect(await screen.findByText(/Create a move first/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("New move name"), "To Shymkent");
    await userEvent.click(screen.getByRole("button", { name: "Create move" }));
    expect(await screen.findByLabelText("Move")).toHaveDisplayValue("To Shymkent");
  });
});

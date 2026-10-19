import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../api";
import { loginAs, renderApp } from "../test/render";

beforeEach(async () => {
  await loginAs();
});

const cards = () => screen.getAllByRole("article");

describe("dashboard", () => {
  it("shows counters and tag cards", async () => {
    renderApp("/");
    expect(await screen.findByRole("heading", { name: "Keys to your first home" })).toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "Summary" });
    expect(within(summary).getByText("Tags").previousSibling).toHaveTextContent("16");
    expect(within(summary).getByText("Unread replies").previousSibling).toHaveTextContent("1");
    expect(cards()).toHaveLength(16);
    expect(screen.getByText("7KQ4 M2XP")).toBeInTheDocument();
  });

  it("filters by kind and keeps it in the URL", async () => {
    renderApp("/?kind=keepsake");
    await screen.findByRole("heading", { name: "Grandpa Serik's dombra" });
    expect(cards()).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Gifts" }));
    expect(await screen.findByRole("heading", { name: "Happy 30th, Dana" })).toBeInTheDocument();
    expect(cards()).toHaveLength(2);
  });

  it("searches by title", async () => {
    renderApp("/");
    await screen.findByRole("heading", { name: "Keys to your first home" });
    await userEvent.type(screen.getByLabelText("Search tags by title"), "kitchen");
    expect(await screen.findByRole("heading", { name: "Kitchen everyday" })).toBeInTheDocument();
    await screen.findByText("1 tags");
  });

  it("shows archived tags only with the Archived filter", async () => {
    renderApp("/?archived=1");
    expect(await screen.findByRole("heading", { name: "Teacher's day flowers" })).toBeInTheDocument();
    expect(cards()).toHaveLength(1);
  });

  it("empty states", async () => {
    renderApp("/?q=zzzz");
    expect(await screen.findByRole("heading", { name: "No tags match" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(await screen.findByRole("heading", { name: "Keys to your first home" })).toBeInTheDocument();
    await api.logOut();
    await api.signUp({ name: "New", email: "new@example.com", password: "password1" });
  });

  it("first-time empty state", async () => {
    await api.logOut();
    await api.signUp({ name: "New", email: "new2@example.com", password: "password1" });
    renderApp("/");
    expect(await screen.findByRole("heading", { name: "No tags yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create your first tag" })).toHaveAttribute("href", "/tags/new");
  });
});

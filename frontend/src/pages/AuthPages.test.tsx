import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../api";
import { renderApp } from "../test/render";

beforeEach(async () => {
  await api.resetDemo!();
});

describe("auth", () => {
  it("redirects to log in and back to the page asked for", async () => {
    renderApp("/moves");
    expect(await screen.findByRole("heading", { name: "Log in" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Use demo account" }));
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("heading", { name: "Moves" })).toBeInTheDocument();
  });

  it("shows one error for a wrong email or password", async () => {
    renderApp("/login");
    await userEvent.type(await screen.findByLabelText("Email"), "aigerim@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is wrong");
  });

  it("shows sign up errors under the fields", async () => {
    renderApp("/signup");
    await userEvent.type(await screen.findByLabelText("Email"), "aigerim@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Name"), "Aigerim");
    await userEvent.clear(screen.getByLabelText("Password"));
    await userEvent.type(screen.getByLabelText("Password"), "longenough");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("An account with this email already exists")).toBeInTheDocument();
  });

  it("signs up and logs out", async () => {
    renderApp("/signup");
    await userEvent.type(await screen.findByLabelText("Name"), "Nurlan Bekov");
    await userEvent.type(screen.getByLabelText("Email"), "nurlan@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password1");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    await userEvent.click(await screen.findByRole("button", { name: "Nurlan" }));
    await userEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(await screen.findByRole("heading", { name: "Log in" })).toBeInTheDocument();
    expect(await api.me()).toBeNull();
  });

  it("ignores an outside next parameter", async () => {
    renderApp("/login?next=//evil.example.com");
    await userEvent.click(await screen.findByRole("button", { name: "Use demo account" }));
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("heading", { name: "My tags" })).toBeInTheDocument();
  });
});

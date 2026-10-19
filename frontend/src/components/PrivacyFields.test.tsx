import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../api";
import { loginAs, renderApp } from "../test/render";

beforeEach(async () => {
  await loginAs();
});

describe("privacy fields", () => {
  it("requires a PIN for a new PIN tag", async () => {
    renderApp("/tags/new");
    await userEvent.type(await screen.findByLabelText("Title"), "Secret");
    await userEvent.click(screen.getByRole("radio", { name: /PIN/ }));
    await userEvent.click(screen.getByRole("button", { name: "Create tag" }));
    expect(screen.getByText("Set a PIN of 4 to 6 digits")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("PIN"), "12ab34");
    expect(screen.getByLabelText("PIN")).toHaveValue("1234");
    await userEvent.click(screen.getByRole("button", { name: "Create tag" }));
    expect(await screen.findByRole("heading", { name: "Secret" })).toBeInTheDocument();
  });

  it("keeps the old PIN when editing without changing it", async () => {
    renderApp("/tags/t_dombra/edit");
    expect(await screen.findByText("PIN is set")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Title"), "!");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("heading", { name: "Grandpa Serik's dombra!" });
    await api.logOut();
    await api.unlockTag("D8RW5TQN", "1971");
  });

  it("rejects an opening date in the past", async () => {
    renderApp("/tags/new");
    await userEvent.type(await screen.findByLabelText("Title"), "Capsule");
    await userEvent.click(screen.getByRole("switch", { name: "Open on a date (time capsule)" }));
    const input = screen.getByLabelText("Opens on");
    await userEvent.type(input, "2020-01-01T10:00");
    await userEvent.click(screen.getByRole("button", { name: "Create tag" }));
    expect(screen.getByText("The open date must be in the future")).toBeInTheDocument();
  });

  it("saves a future opening date and a theme", async () => {
    renderApp("/tags/new");
    await userEvent.type(await screen.findByLabelText("Title"), "Capsule");
    await userEvent.click(screen.getByRole("switch", { name: "Open on a date (time capsule)" }));
    await userEvent.type(screen.getByLabelText("Opens on"), "2031-05-01T09:00");
    await userEvent.click(screen.getByRole("radio", { name: /Night/ }));
    await userEvent.click(screen.getByRole("button", { name: "Create tag" }));
    await screen.findByRole("heading", { name: "Capsule" });
    const tags = await api.listTags({ q: "Capsule" });
    expect(tags[0].theme).toBe("night");
    expect(new Date(tags[0].opensAt!).getFullYear()).toBe(2031);
  });

  it("switching away from PIN removes it", async () => {
    renderApp("/tags/t_dombra/edit");
    await screen.findByText("PIN is set");
    await userEvent.click(screen.getByRole("radio", { name: /Public/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("heading", { name: "Grandpa Serik's dombra" });
    expect((await api.getTag("t_dombra")).hasPin).toBe(false);
  });
});

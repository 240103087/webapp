import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../api";
import { loginAs, renderApp } from "../test/render";

beforeEach(async () => {
  await api.resetDemo!();
});

describe("replies", () => {
  it("a visitor sends a reply and the form clears", async () => {
    renderApp("/t/7KQ4M2XP");
    await userEvent.click(await screen.findByRole("button", { name: "Send" }));
    expect(screen.getByText("Name is required")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Your name"), "Aruzhan");
    await userEvent.type(screen.getByLabelText("Message"), "Рахмет, мама!");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Thank you! Your reply was sent.")).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toHaveValue("");
  });

  it("shows the limit message after 10 replies in an hour", async () => {
    for (let i = 0; i < 10; i++) await api.postReply("7KQ4M2XP", { name: "V", message: `m${i}` });
    renderApp("/t/7KQ4M2XP");
    await userEvent.type(await screen.findByLabelText("Your name"), "V");
    await userEvent.type(screen.getByLabelText("Message"), "again");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Too many replies right now. Try again later.")).toBeInTheDocument();
  });

  it("no form when replies are off", async () => {
    renderApp("/t/M5ZT3XCG");
    await screen.findByText("BOX 07");
    expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();
  });

  it("the owner sees replies, they become read, and can delete one", async () => {
    await loginAs();
    expect((await api.getStats()).unreadReplies).toBe(1);
    renderApp("/tags/t_keys");
    const panel = (await screen.findByRole("heading", { name: /Replies/ })).closest("section")!;
    expect(await within(panel).findByText(/I cried at the bus stop/)).toBeInTheDocument();
    expect(within(panel).getByText("New")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 20));
    expect((await api.getStats()).unreadReplies).toBe(0);
    await userEvent.click(within(panel).getByRole("button", { name: "Delete reply from Timur" }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Reply deleted")).toBeInTheDocument();
    expect((await api.listReplies("t_keys")).map((r) => r.name)).toEqual(["Aruzhan"]);
  });
});

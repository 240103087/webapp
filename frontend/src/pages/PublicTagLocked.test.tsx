import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../api";
import { loginAs, renderApp } from "../test/render";

beforeEach(async () => {
  await api.resetDemo!();
});

describe("public page, locked states", () => {
  it("unknown code with a field to type a code", async () => {
    const { router } = renderApp("/t/ZZZZ2222");
    expect(await screen.findByRole("heading", { name: "No tag with this code" })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Tag code"), "7kq4 m2xp");
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(router.state.location.pathname).toBe("/t/7KQ4M2XP");
    expect(await screen.findByRole("heading", { name: "Keys to your first home" })).toBeInTheDocument();
  });

  it("archived and private", async () => {
    renderApp("/t/V3CT7NWB");
    expect(await screen.findByRole("heading", { name: "This tag is no longer active" })).toBeInTheDocument();
  });
  it("private", async () => {
    renderApp("/t/S6ZE3VKA");
    expect(await screen.findByRole("heading", { name: "This tag is private" })).toBeInTheDocument();
    expect(screen.queryByText(/Medeu/)).not.toBeInTheDocument();
  });

  it("time-locked shows a countdown and no content", async () => {
    renderApp("/t/P4XH9M3K");
    expect(await screen.findByRole("heading", { name: "Happy 30th, Dana" })).toBeInTheDocument();
    expect(screen.getByText("days")).toBeInTheDocument();
    expect(screen.getByText(/This capsule opens on/)).toBeInTheDocument();
    expect(screen.queryByText(/Thirty!/)).not.toBeInTheDocument();
  });

  it("wrong PIN shows attempts left, right PIN opens and is remembered", async () => {
    const first = renderApp("/t/D8RW5TQN");
    await userEvent.type(await screen.findByLabelText("Enter the PIN"), "0000");
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByText("Wrong PIN. 4 attempts left")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Enter the PIN"), "1971");
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByRole("heading", { name: "Grandpa Serik's dombra" })).toBeInTheDocument();
    first.unmount();
    renderApp("/t/D8RW5TQN");
    expect(await screen.findByRole("heading", { name: "Grandpa Serik's dombra" })).toBeInTheDocument();
  });

  it("locks after 5 wrong PINs", async () => {
    renderApp("/t/D8RW5TQN");
    const input = await screen.findByLabelText("Enter the PIN");
    for (let i = 0; i < 5; i++) {
      await userEvent.type(input, "0000");
      await userEvent.click(screen.getByRole("button", { name: "Open" }));
      await act(async () => {});
    }
    expect(await screen.findByText(/Too many attempts/)).toBeInTheDocument();
    expect(screen.getByLabelText("Enter the PIN")).toBeDisabled();
  });

  it("the owner previews a locked tag", async () => {
    await loginAs();
    renderApp("/t/P4XH9M3K");
    expect(await screen.findByText(/Thirty!/)).toBeInTheDocument();
  });
});

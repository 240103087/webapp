import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { loginAs, renderApp } from "../test/render";

beforeEach(async () => {
  await loginAs();
});

describe("move search", () => {
  it("finds the kettle with box, room and highlighted item", async () => {
    const { router } = renderApp("/moves/m_astana");
    await userEvent.type(await screen.findByLabelText("Where is my..."), "kettle");
    const marks = await screen.findAllByText("kettle", { selector: "mark" });
    expect(marks.length).toBeGreaterThan(0);
    expect(screen.getByText("BOX 07")).toBeInTheDocument();
    expect(screen.getByText("BOX 09")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /BOX 07/ })).toHaveAttribute("href", "/tags/t_box7");
    expect(router.state.location.search).toBe("?q=kettle");
  });

  it("says when nothing is found and goes back to rooms when cleared", async () => {
    renderApp("/moves/m_astana?q=piano");
    expect(await screen.findByText("Nothing found in this move")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Where is my..."));
    expect(await screen.findByRole("heading", { name: "Kitchen · 4" })).toBeInTheDocument();
  });

  it("does not render user text as HTML", async () => {
    renderApp("/moves/m_astana?q=<b>");
    expect(await screen.findByText("Nothing found in this move")).toBeInTheDocument();
  });
});

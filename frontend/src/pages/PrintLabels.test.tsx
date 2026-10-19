import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { loginAs, renderApp } from "../test/render";
import printCss from "../styles/print.css?raw";

beforeEach(async () => {
  await loginAs();
});

describe("print labels", () => {
  it("asks to pick something first", async () => {
    renderApp("/print");
    expect(await screen.findByText("Pick a move or some tags to print.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeDisabled();
  });

  it("a move fills the sheets with its boxes; size changes labels per page", async () => {
    renderApp("/print?move=m_astana");
    await screen.findAllByTestId("label");
    expect(screen.getAllByTestId("label")).toHaveLength(12);
    expect(screen.getAllByTestId("sheet")).toHaveLength(2);
    const first = screen.getAllByTestId("label")[0];
    expect(within(first).getByText("BOX 01")).toBeInTheDocument();
    expect(within(first).getByText("FRAGILE")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "S" }));
    expect(screen.getAllByTestId("sheet")).toHaveLength(1);
    await userEvent.click(screen.getByRole("radio", { name: "L" }));
    expect(screen.getAllByTestId("sheet")).toHaveLength(6);
  });

  it("picks tags by hand and does not offer archived tags", async () => {
    renderApp("/print");
    await userEvent.click(await screen.findByRole("checkbox", { name: /Keys to your first home/ }));
    expect(screen.getAllByTestId("label")).toHaveLength(1);
    expect(screen.queryByRole("checkbox", { name: /Teacher's day/ })).not.toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "QR code for Keys to your first home" })).toBeInTheDocument();
  });

  it("printed labels use their own class, so form headings are not styled as labels (#55)", async () => {
    renderApp("/print?move=m_astana");
    const labels = await screen.findAllByTestId("label");
    for (const l of labels) expect(l).toHaveClass("print-label");
    expect(document.querySelectorAll(".label.print-label, legend.print-label")).toHaveLength(0);
    // No selector in print.css may target the shared `.label` class used by forms.
    expect(printCss).not.toMatch(/\.label\b/);
  });
});

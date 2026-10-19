import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { api, ApiError } from "../api";
import { loginAs, renderApp } from "../test/render";
import printCss from "../styles/print.css?raw";

beforeEach(async () => {
  await loginAs();
});
afterEach(() => vi.restoreAllMocks());

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

  it("shows the error with Retry when the tags cannot be loaded (#59)", async () => {
    const failing = vi.spyOn(api, "listTags").mockRejectedValue(new ApiError(500, { code: "server_error", message: "The server had a problem. Try again in a moment." }));
    renderApp("/print?move=m_astana");
    expect(await screen.findByRole("alert")).toHaveTextContent("The server had a problem");
    expect(screen.queryByText("Pick a move or some tags to print.")).not.toBeInTheDocument();
    failing.mockRestore();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findAllByTestId("label")).toHaveLength(12);
  });
});

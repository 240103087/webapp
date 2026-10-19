import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { api } from "../api";
import { loginAs, renderApp } from "../test/render";

beforeAll(() => {
  let n = 0;
  URL.createObjectURL = () => `blob:test/${++n}`;
  URL.revokeObjectURL = () => {};
});
beforeEach(async () => {
  await loginAs();
});

const file = (name: string, type: string, size: number) => {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
};

describe("media", () => {
  it("uploads a photo and refuses bad files, other files still upload", async () => {
    renderApp("/tags/t_birthday");
    const input = await screen.findByLabelText("Add photos, videos or audio");
    await userEvent.upload(input, [file("ok.png", "image/png", 2000), file("doc.pdf", "application/pdf", 10), file("huge.jpg", "image/jpeg", 11 * 1024 * 1024)], { applyAccept: false });
    expect(await screen.findByText(/not supported/)).toBeInTheDocument();
    expect(screen.getByText(/Too big/)).toBeInTheDocument();
    expect(await screen.findByLabelText("Caption for item 2")).toBeInTheDocument();
    expect((await api.getTag("t_birthday")).media).toHaveLength(2);
  });

  it("reorders with up and down and keeps the order", async () => {
    renderApp("/tags/t_keys");
    await screen.findByLabelText("Caption for item 1");
    await userEvent.click(screen.getByRole("button", { name: "Move item 2 down" }));
    const media = (await api.getTag("t_keys")).media;
    expect(media.map((m) => m.caption)).toEqual(["The keys, finally", "From Ata", "The view from our old balcony", "Everyone says hi"]);
  });

  it("edits a caption on blur", async () => {
    renderApp("/tags/t_keys");
    const cap = await screen.findByLabelText("Caption for item 1");
    await userEvent.clear(cap);
    await userEvent.type(cap, "Shiny keys");
    await userEvent.tab();
    await screen.findByDisplayValue("Shiny keys");
    await new Promise((r) => setTimeout(r, 10));
    expect((await api.getTag("t_keys")).media[0].caption).toBe("Shiny keys");
  });

  it("deletes after confirming", async () => {
    renderApp("/tags/t_keys");
    await userEvent.click(await screen.findByRole("button", { name: "Delete item 1" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await screen.findByText("Deleted");
    expect((await api.getTag("t_keys")).media).toHaveLength(3);
  });

  it("refuses more than 20 files", async () => {
    renderApp("/tags/t_birthday");
    const input = await screen.findByLabelText("Add photos, videos or audio");
    const files = Array.from({ length: 20 }, (_, i) => file(`p${i}.jpg`, "image/jpeg", 1000));
    await userEvent.upload(input, files, { applyAccept: false });
    expect(await screen.findByText("A tag can have at most 20 media files")).toBeInTheDocument();
    await screen.findByText("20 / 20");
  });

  it("uploading two files at once logs no React warnings (#52)", async () => {
    const spy = vi.spyOn(console, "error");
    renderApp("/tags/t_birthday");
    const input = await screen.findByLabelText("Add photos, videos or audio");
    await userEvent.upload(input, [file("a.png", "image/png", 2000), file("b.png", "image/png", 2000)]);
    expect(await screen.findByLabelText("Caption for item 3")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { hidden: true }).length).toBeGreaterThan(0);
    expect((await api.getTag("t_birthday")).media).toHaveLength(3);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

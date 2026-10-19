import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../api";
import { loginAs, renderApp } from "../test/render";

beforeEach(async () => {
  await loginAs();
});

describe("archive and delete (#20)", () => {
  it("archives from the tag page, hides it from the dashboard and the public page says inactive", async () => {
    const { router } = renderApp("/tags/t_keys");
    await screen.findByRole("heading", { level: 1, name: "Keys to your first home" });
    await userEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(await screen.findByText(/Archived\. Visitors who scan/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unarchive" })).toBeInTheDocument();

    await router.navigate("/");
    await screen.findByRole("heading", { name: "Kitchen everyday" });
    expect(screen.queryByRole("heading", { name: "Keys to your first home" })).not.toBeInTheDocument();

    await api.logOut();
    await router.navigate("/t/7KQ4M2XP");
    expect(await screen.findByRole("heading", { name: "This tag is no longer active" })).toBeInTheDocument();
  });

  it("unarchives from the card menu in the Archived filter", async () => {
    renderApp("/?archived=1");
    const card = (await screen.findByRole("heading", { name: "Teacher's day flowers" })).closest("article")!;
    await userEvent.click(within(card).getByRole("button", { name: /More actions for/ }));
    await userEvent.click(within(card).getByRole("menuitem", { name: "Unarchive" }));
    expect(await screen.findByText(/is active again/)).toBeInTheDocument();
    expect((await api.getTag("t_old")).status).toBe("active");
  });

  it("delete asks to confirm, Cancel keeps the tag", async () => {
    renderApp("/tags/t_keys");
    await screen.findByRole("heading", { level: 1, name: "Keys to your first home" });
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("alertdialog", { name: "Delete “Keys to your first home”?" });
    expect(within(dialog).getByText(/Printed QR codes will stop working/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect((await api.getTag("t_keys")).title).toBe("Keys to your first home");
  });

  it("delete removes the tag, returns to the dashboard and the code becomes unknown", async () => {
    const { router } = renderApp("/tags/t_keys");
    await screen.findByRole("heading", { level: 1, name: "Keys to your first home" });
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("“Keys to your first home” deleted")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    await screen.findByRole("heading", { name: "Kitchen everyday" });
    expect(screen.getAllByRole("article")).toHaveLength(15);

    await router.navigate("/t/7KQ4M2XP");
    expect(await screen.findByRole("heading", { name: "No tag with this code" })).toBeInTheDocument();
  });

  it("deleting the last box does not reuse its number", async () => {
    const last = (await api.listTags({ moveId: "m_astana" })).reduce((a, b) => ((a.boxNumber ?? 0) > (b.boxNumber ?? 0) ? a : b));
    expect(last.boxNumber).toBe(12);
    await api.deleteTag(last.id);
    const created = await api.createTag({
      kind: "box", title: "Books", message: "", privacy: "public", theme: "kraft", allowReplies: false,
      moveId: "m_astana", room: "Study", contents: ["novels"], fragile: false,
    } as never);
    expect(created.boxNumber).toBe(13);
  });
});

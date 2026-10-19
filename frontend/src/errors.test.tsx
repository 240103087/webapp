import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { api, ApiError, SESSION_EXPIRED_EVENT } from "./api";
import { loginAs, renderApp } from "./test/render";

beforeEach(async () => {
  await loginAs();
});
afterEach(() => vi.restoreAllMocks());

const offline = () => new ApiError(0, { code: "network", message: "No connection to the server. Check your internet and try again." });
const serverDown = () => new ApiError(500, { code: "server_error", message: "The server had a problem. Try again in a moment." });

describe("backend errors (#37)", () => {
  it("an expired session sends the owner to log in and back to the same page", async () => {
    const { router } = renderApp("/tags/t_keys?tab=media");
    await screen.findByRole("heading", { name: "Keys to your first home" });
    // What the HTTP client does on a 401 from an owner call.
    await api.logOut();
    act(() => {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    });
    expect(await screen.findByRole("heading", { name: "Log in" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(new URLSearchParams(router.state.location.search).get("next")).toBe("/tags/t_keys?tab=media");
    expect(screen.getByText("Your session has ended. Log in again to continue.")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Email"), "aigerim@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("heading", { name: "Keys to your first home" })).toBeInTheDocument();
    expect(router.state.location.pathname + router.state.location.search).toBe("/tags/t_keys?tab=media");
  });

  it("no connection on the dashboard shows the message and Retry loads it", async () => {
    const fail_listTags = vi.spyOn(api, "listTags").mockRejectedValue(offline());
    renderApp("/");
    expect(await screen.findByRole("alert")).toHaveTextContent("No connection to the server");
    fail_listTags.mockRestore();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Keys to your first home" })).toBeInTheDocument();
  });

  it("a server error on a tag page offers Retry; a missing tag does not", async () => {
    const fail_getTag = vi.spyOn(api, "getTag").mockRejectedValue(serverDown());
    const { unmount } = renderApp("/tags/t_keys");
    expect(await screen.findByRole("alert")).toHaveTextContent("The server had a problem");
    fail_getTag.mockRestore();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Keys to your first home" })).toBeInTheDocument();
    unmount();
    renderApp("/tags/nope");
    expect(await screen.findByRole("alert")).toHaveTextContent("This tag does not exist or is not yours.");
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("moves list, move search and replies show Retry instead of looking empty", async () => {
    const fail_listMoves = vi.spyOn(api, "listMoves").mockRejectedValue(offline());
    const a = renderApp("/moves");
    await screen.findByRole("button", { name: "Retry" });
    fail_listMoves.mockRestore();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("link", { name: /Almaty → Astana/ })).toBeInTheDocument();
    a.unmount();

    const fail_searchMove = vi.spyOn(api, "searchMove").mockRejectedValue(serverDown());
    const b = renderApp("/moves/m_astana?q=kettle");
    expect(await screen.findByText("The server had a problem. Try again in a moment.")).toBeInTheDocument();
    expect(screen.queryByText("Nothing found in this move")).not.toBeInTheDocument();
    fail_searchMove.mockRestore();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findAllByText("BOX 07")).not.toHaveLength(0);
    b.unmount();

    vi.spyOn(api, "listReplies").mockRejectedValue(offline());
    renderApp("/tags/t_keys");
    expect(await screen.findByText(/No connection to the server/)).toBeInTheDocument();
    expect(screen.queryByText("No replies yet.")).not.toBeInTheDocument();
  });

  it("a failed save keeps what was typed", async () => {
    vi.spyOn(api, "createTag").mockRejectedValue(offline());
    renderApp("/tags/new");
    await userEvent.type(await screen.findByLabelText("Title"), "Still here");
    await userEvent.click(screen.getByRole("button", { name: "Create tag" }));
    expect(await screen.findByText(/No connection to the server/)).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Still here");
  });

  it("a slow older dashboard request does not overwrite a newer filter", async () => {
    const real = api.listTags.bind(api);
    vi.spyOn(api, "listTags").mockImplementation(async (q) => {
      const list = await real(q);
      if (!q?.kind) await new Promise((r) => setTimeout(r, 150));
      return list;
    });
    renderApp("/");
    await userEvent.click(await screen.findByRole("button", { name: "Gifts" }));
    expect(await screen.findByRole("heading", { name: "Happy 30th, Dana" })).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 250));
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });
});

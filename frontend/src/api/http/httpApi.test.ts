import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHttpApi } from "./httpApi";
import { ApiError } from "../types";
import { getToken, setToken } from "../clientState";

type Call = { url: string; method: string; headers: Record<string, string>; body?: unknown };

function stub(responses: Array<{ status: number; body?: unknown } | "offline">) {
  const calls: Call[] = [];
  const fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(url),
      method: init?.method ?? "GET",
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    const r = responses.shift() ?? { status: 204 };
    if (r === "offline") throw new TypeError("Failed to fetch");
    const text = r.body === undefined ? null : typeof r.body === "string" ? r.body : JSON.stringify(r.body);
    return new Response(text, { status: r.status, headers: { "Content-Type": "application/json" } });
  });
  return { api: createHttpApi({ baseUrl: "http://x", fetch: fetch as unknown as typeof globalThis.fetch }), calls };
}

async function err(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p;
  } catch (e) {
    return e as ApiError;
  }
  throw new Error("expected an error");
}

const user = { id: "u1", name: "A", email: "a@example.com", createdAt: "2026-10-19T10:00:00.000Z" };

beforeEach(() => localStorage.clear());

describe("http api (#36)", () => {
  it("logs in, keeps the token and sends it with later calls", async () => {
    const { api, calls } = stub([{ status: 200, body: { token: "tok1", user } }, { status: 200, body: [] }]);
    await api.logIn({ email: "a@example.com", password: "password123" });
    expect(getToken()).toBe("tok1");
    await api.listTags({ kind: "box", archived: true, q: "tea" });
    expect(calls[0]).toMatchObject({ url: "http://x/api/auth/login", method: "POST", body: { email: "a@example.com" } });
    expect(calls[0].headers["Content-Type"]).toBe("application/json");
    expect(calls[1].url).toBe("http://x/api/tags?q=tea&kind=box&archived=true");
    expect(calls[1].headers.Authorization).toBe("Bearer tok1");
    expect(calls[1].headers["X-Visitor-Id"]).toMatch(/^v_/);
  });

  it("maps paths and methods to the contract", async () => {
    setToken("t");
    const { api, calls } = stub([]);
    await api.setArchived("t/1", true);
    await api.reorderMedia("t1", ["m2", "m1"]);
    await api.updateMedia("t1", "m1", { caption: "hi" });
    await api.markRepliesRead("t1");
    await api.searchMove("m1", "kettle & cups");
    await api.deleteTag("t1");
    expect(calls.map((c) => `${c.method} ${c.url.replace("http://x", "")}`)).toEqual([
      "PUT /api/tags/t%2F1/archive",
      "PUT /api/tags/t1/media/order",
      "PATCH /api/tags/t1/media/m1",
      "POST /api/tags/t1/replies/read",
      "GET /api/moves/m1/search?q=kettle%20%26%20cups",
      "DELETE /api/tags/t1",
    ]);
    expect(calls[0].body).toEqual({ archived: true });
    expect(calls[1].body).toEqual({ mediaIds: ["m2", "m1"] });
  });

  it("turns error bodies into ApiError with fields and PIN details", async () => {
    const { api } = stub([
      { status: 422, body: { code: "validation", message: "Check the form", fields: { title: "Title is required" } } },
      { status: 403, body: { code: "wrong_pin", message: "Wrong PIN", attemptsLeft: 3 } },
    ]);
    setToken("t");
    const e1 = await err(api.createTag({ kind: "gift", title: "" }));
    expect(e1).toBeInstanceOf(ApiError);
    expect(e1.status).toBe(422);
    expect(e1.fields?.title).toBe("Title is required");
    const e2 = await err(api.unlockTag("ABCD2345", "0000"));
    expect(e2.attemptsLeft).toBe(3);
  });

  it("reports no connection as status 0 and a non-JSON 502 as a server problem", async () => {
    const { api } = stub(["offline", { status: 502, body: "<html>Bad gateway</html>" }]);
    setToken("t");
    const e1 = await err(api.listMoves());
    expect(e1.status).toBe(0);
    expect(e1.code).toBe("network");
    const e2 = await err(api.listMoves());
    expect(e2.status).toBe(502);
    expect(e2.message).toMatch(/server had a problem/);
  });

  it("drops the session and tells the app when an owner call gets 401", async () => {
    setToken("old");
    const heard = vi.fn();
    window.addEventListener("moveeasy:unauthorized", heard);
    const { api } = stub([
      { status: 401, body: { code: "unauthorized", message: "Please log in" } },
      { status: 401, body: { code: "bad_credentials", message: "Wrong email or password" } },
    ]);
    await err(api.listTags());
    expect(getToken()).toBeNull();
    expect(heard).toHaveBeenCalledTimes(1);
    // A failed login is a form error, not an expired session.
    await err(api.logIn({ email: "a@example.com", password: "x" }));
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener("moveeasy:unauthorized", heard);
  });

  it("me() is null without a token and after a 401, without throwing", async () => {
    const { api, calls } = stub([{ status: 401, body: { code: "unauthorized", message: "Please log in" } }]);
    expect(await api.me()).toBeNull();
    expect(calls).toHaveLength(0);
    setToken("stale");
    expect(await api.me()).toBeNull();
    expect(getToken()).toBeNull();
  });

  it("logOut clears the token even if the server is unreachable", async () => {
    setToken("t");
    const { api } = stub(["offline"]);
    await err(api.logOut());
    expect(getToken()).toBeNull();
  });

  it("remembers a PIN unlock and sends it for that tag only", async () => {
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();
    const { api, calls } = stub([
      { status: 200, body: { accessToken: "unl", expiresAt } },
      { status: 200, body: { state: "unknown" } },
      { status: 200, body: { state: "unknown" } },
      { status: 201, body: { id: "r1" } },
    ]);
    await api.unlockTag("d8rw 5tqn", "1971");
    await api.getPublicTag("D8RW5TQN");
    await api.getPublicTag("7KQ4M2XP");
    await api.postReply("d8rw5tqn", { name: "V", message: "hi" });
    expect(calls[1].headers["X-Unlock-Token"]).toBe("unl");
    expect(calls[2].headers["X-Unlock-Token"]).toBeUndefined();
    expect(calls[3].headers["X-Unlock-Token"]).toBe("unl");
  });
});

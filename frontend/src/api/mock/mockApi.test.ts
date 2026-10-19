import { describe, it, expect, beforeEach } from "vitest";
import { createMockApi } from "./mockApi";
import { ApiError } from "../types";

let clock = new Date("2026-10-19T10:00:00Z");
const make = () => createMockApi({ latency: [0, 0], now: () => clock });

beforeEach(() => {
  localStorage.clear();
  clock = new Date("2026-10-19T10:00:00Z");
});

async function err(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p;
  } catch (e) {
    return e as ApiError;
  }
  throw new Error("expected an error");
}

describe("mock api", () => {
  it("signs up, logs out and logs in", async () => {
    const api = make();
    const s = await api.signUp({ name: "Test", email: "Test@Example.com", password: "password1" });
    expect(s.user.email).toBe("test@example.com");
    expect((await api.me())?.name).toBe("Test");
    await api.logOut();
    expect(await api.me()).toBeNull();
    expect((await err(api.logIn({ email: "test@example.com", password: "nope" }))).status).toBe(401);
    await api.logIn({ email: "test@example.com", password: "password1" });
    expect((await err(api.signUp({ name: "X", email: "test@example.com", password: "password1" }))).code).toBe("email_taken");
  });

  it("returns field errors in one shape", async () => {
    const api = make();
    await api.logIn({ email: "aigerim@example.com", password: "password123" });
    const e = await err(api.createTag({ kind: "gift", title: "" }));
    expect(e.status).toBe(422);
    expect(e.fields?.title).toBe("Title is required");
  });

  it("creates and lists tags, owner only", async () => {
    const api = make();
    await api.logIn({ email: "dana@example.com", password: "password123" });
    const t = await api.createTag({ kind: "gift", title: "Socks", message: "warm" });
    expect(t.code).toMatch(/^[2-9A-Z]{8}$/);
    expect((await api.listTags()).map((x) => x.title)).toContain("Socks");
    expect((await api.listTags({ kind: "box" })).length).toBe(0);
    await api.logOut();
    await api.logIn({ email: "aigerim@example.com", password: "password123" });
    expect((await err(api.getTag(t.id))).status).toBe(404);
    expect((await api.listTags({ kind: "box" })).length).toBe(12);
    expect((await api.listTags({ archived: true })).map((x) => x.title)).toEqual(["Teacher's day flowers"]);
  });

  it("numbers boxes per move and never reuses numbers", async () => {
    const api = make();
    await api.logIn({ email: "aigerim@example.com", password: "password123" });
    const a = await api.createTag({ kind: "box", title: "A", moveId: "m_astana", room: "Kitchen" });
    expect(a.boxNumber).toBe(13);
    await api.deleteTag(a.id);
    const b = await api.createTag({ kind: "box", title: "B", moveId: "m_astana", room: "Kitchen" });
    expect(b.boxNumber).toBe(14);
    const edited = await api.updateTag(b.id, { kind: "box", title: "B2", moveId: "m_astana", room: "Office" });
    expect(edited.boxNumber).toBe(14);
    expect((await err(api.deleteMove("m_astana"))).code).toBe("move_not_empty");
    const hits = await api.searchMove("m_astana", "kettle");
    expect(hits.map((h) => h.boxNumber)).toEqual([7, 9]);
  });

  it("enforces privacy states on the public page", async () => {
    const api = make();
    expect((await api.getPublicTag("ZZZZZZZZ")).state).toBe("unknown");
    expect((await api.getPublicTag("V3CT7NWB")).state).toBe("archived");
    expect((await api.getPublicTag("S6ZE3VKA")).state).toBe("private");
    const locked = await api.getPublicTag("P4XH9M3K");
    expect(locked.state).toBe("timeLocked");
    expect(locked).not.toHaveProperty("tag");
    expect((await api.getPublicTag("d8rw-5tqn")).state).toBe("pinRequired");
    const open = await api.getPublicTag("7KQ4M2XP");
    expect(open.state === "open" && open.tag.media.length).toBe(4);
  });

  it("counts scans for visitors but not for the owner", async () => {
    const api = make();
    await api.logIn({ email: "aigerim@example.com", password: "password123" });
    const before = (await api.getTag("t_keys")).scanCount;
    const preview = await api.getPublicTag("7KQ4M2XP");
    expect(preview.state === "open" && preview.preview).toBe(true);
    expect((await api.getTag("t_keys")).scanCount).toBe(before);
    await api.logOut();
    await api.getPublicTag("7KQ4M2XP");
    await api.logIn({ email: "aigerim@example.com", password: "password123" });
    expect((await api.getTag("t_keys")).scanCount).toBe(before + 1);
  });

  it("counts one scan per visitor per 30 minutes (#56)", async () => {
    const api = make();
    await api.logIn({ email: "aigerim@example.com", password: "password123" });
    const before = (await api.getTag("t_keys")).scanCount;
    await api.logOut();
    await api.getPublicTag("7KQ4M2XP");
    await api.getPublicTag("7KQ4M2XP"); // React development mode loads twice
    clock = new Date(clock.getTime() + 10 * 60_000);
    await api.getPublicTag("7KQ4M2XP"); // reload 10 minutes later
    await api.logIn({ email: "aigerim@example.com", password: "password123" });
    expect((await api.getTag("t_keys")).scanCount).toBe(before + 1);
    await api.logOut();
    clock = new Date(clock.getTime() + 31 * 60_000);
    await api.getPublicTag("7KQ4M2XP");
    localStorage.removeItem("moveeasy.visitor");
    await api.getPublicTag("7KQ4M2XP"); // a different visitor
    await api.logIn({ email: "aigerim@example.com", password: "password123" });
    expect((await api.getTag("t_keys")).scanCount).toBe(before + 3);
  });

  it("unlocks with the right PIN and locks after 5 wrong ones", async () => {
    const api = make();
    let e = await err(api.unlockTag("D8RW5TQN", "0000"));
    expect(e.status).toBe(403);
    expect(e.attemptsLeft).toBe(4);
    for (let i = 0; i < 3; i++) await err(api.unlockTag("D8RW5TQN", "0000"));
    e = await err(api.unlockTag("D8RW5TQN", "0000"));
    expect(e.status).toBe(423);
    e = await err(api.unlockTag("D8RW5TQN", "1971"));
    expect(e.status).toBe(423);
    const v = await api.getPublicTag("D8RW5TQN");
    expect(v.state === "pinRequired" && v.lockedUntil).toBeTruthy();
    clock = new Date(clock.getTime() + 16 * 60_000);
    await api.unlockTag("D8RW5TQN", "1971");
    expect((await api.getPublicTag("D8RW5TQN")).state).toBe("open");
  });

  it("time lock opens at the date", async () => {
    const api = make();
    const v = await api.getPublicTag("P4XH9M3K");
    if (v.state !== "timeLocked") throw new Error("expected timeLocked");
    clock = new Date(Date.parse(v.opensAt));
    expect((await api.getPublicTag("P4XH9M3K")).state).toBe("open");
  });

  it("keeps the PIN when editing without a new one, and requires one for a new PIN tag", async () => {
    const api = make();
    await api.logIn({ email: "aigerim@example.com", password: "password123" });
    expect((await err(api.createTag({ kind: "gift", title: "X", privacy: "pin" }))).fields?.pin).toBeTruthy();
    const t = await api.getTag("t_dombra");
    await api.updateTag(t.id, { kind: "keepsake", title: "Renamed", privacy: "pin", message: t.message });
    await api.logOut();
    await api.unlockTag("D8RW5TQN", "1971");
  });

  it("rejects opening dates in the past", async () => {
    const api = make();
    await api.logIn({ email: "aigerim@example.com", password: "password123" });
    const e = await err(api.createTag({ kind: "gift", title: "Late", opensAt: "2020-01-01T00:00:00.000Z" }));
    expect(e.fields?.opensAt).toBe("The open date must be in the future");
  });

  it("limits replies to 10 per tag per hour", async () => {
    const api = make();
    for (let i = 0; i < 10; i++) await api.postReply("7KQ4M2XP", { name: "V", message: `hi ${i}` });
    expect((await err(api.postReply("7KQ4M2XP", { name: "V", message: "again" }))).status).toBe(429);
    expect((await err(api.postReply("D8RW5TQN", { name: "V", message: "x" }))).status).toBe(403);
  });

  it("persists to localStorage across instances", async () => {
    const a = make();
    await a.signUp({ name: "P", email: "p@example.com", password: "password1" });
    await a.createTag({ kind: "keepsake", title: "Persisted" });
    const b = make();
    expect((await b.listTags()).map((t) => t.title)).toContain("Persisted");
  });
});

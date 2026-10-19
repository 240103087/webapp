import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { MoveRow, Store, TagRow } from "../src/store/types";

/**
 * The tests every `Store` implementation must pass (#24, #34). Called with a
 * factory that returns an empty store.
 */
export function storeSuite(name: string, make: () => Promise<Store>) {
  describe(`Store contract: ${name}`, () => {
    let s: Store;
    beforeEach(async () => {
      s = await make();
    });
    afterEach(async () => {
      await s.close();
    });

    const at = "2026-10-19T10:00:00.000Z";
    const user = (id: string, email = `${id}@example.com`) => ({ id, name: id, email, passwordHash: "h", createdAt: at });
    const move = (id: string, ownerId = "u1", extra: Partial<MoveRow> = {}): MoveRow => ({
      id, ownerId, name: `Move ${id}`, fromAddress: null, toAddress: null, date: null, lastBoxNumber: 0, createdAt: at, ...extra,
    });
    const tag = (id: string, extra: Partial<TagRow> = {}): TagRow => ({
      id, ownerId: "u1", code: `CODE${id.toUpperCase()}`.slice(0, 8).padEnd(8, "2"), kind: "gift", title: `Tag ${id}`, recipient: null, message: "",
      theme: "paper", privacy: "public", pinHash: null, opensAt: null, allowReplies: true, status: "active", moveId: null, boxNumber: null,
      room: null, contents: [], fragile: false, createdAt: at, updatedAt: at, ...extra,
    });

    it("starts empty", async () => {
      expect(await s.isEmpty()).toBe(true);
    });

    it("users and sessions", async () => {
      await s.insertUser(user("u1"));
      expect(await s.isEmpty()).toBe(false);
      expect((await s.getUser("u1"))?.email).toBe("u1@example.com");
      expect((await s.getUserByEmail("u1@example.com"))?.id).toBe("u1");
      expect(await s.getUserByEmail("nobody@example.com")).toBeNull();
      await s.insertSession({ token: "tok", userId: "u1", createdAt: at });
      expect((await s.getSession("tok"))?.userId).toBe("u1");
      await s.deleteSession("tok");
      expect(await s.getSession("tok")).toBeNull();
    });

    it("moves, with box numbers that are never reused", async () => {
      await s.insertUser(user("u1"));
      await s.insertMove(move("m1"));
      await s.insertMove(move("m2", "u1", { lastBoxNumber: 12, fromAddress: "A", date: "2026-11-12" }));
      expect((await s.listMoves("u1")).map((m) => m.id).sort()).toEqual(["m1", "m2"]);
      expect(await s.nextBoxNumber("m1")).toBe(1);
      expect(await s.nextBoxNumber("m1")).toBe(2);
      expect(await s.nextBoxNumber("m2")).toBe(13);
      const m = (await s.getMove("m1"))!;
      expect(m.lastBoxNumber).toBe(2);
      await s.updateMove({ ...m, name: "Renamed", toAddress: "B" });
      expect(await s.getMove("m1")).toMatchObject({ name: "Renamed", toAddress: "B", lastBoxNumber: 2 });
      expect((await s.getMove("m2"))!.date).toBe("2026-11-12");
      await s.deleteMove("m1");
      expect(await s.getMove("m1")).toBeNull();
    });

    it("tags: insert, find by code, filter, update, and the returned rows are copies", async () => {
      await s.insertUser(user("u1"));
      await s.insertUser(user("u2"));
      await s.insertMove(move("m1"));
      await s.insertTag(tag("a", { contents: ["kettle", "mugs"], kind: "box", moveId: "m1", boxNumber: 1, room: "Kitchen", fragile: true }));
      await s.insertTag(tag("b", { ownerId: "u2", opensAt: "2027-01-01T00:00:00.000Z", pinHash: "x", privacy: "pin" }));
      const a = (await s.getTag("a"))!;
      expect(a.contents).toEqual(["kettle", "mugs"]);
      expect(a.fragile).toBe(true);
      a.contents.push("changed outside");
      expect((await s.getTag("a"))!.contents).toEqual(["kettle", "mugs"]);
      expect((await s.getTagByCode(a.code))?.id).toBe("a");
      expect(await s.getTagByCode("NOPE2222")).toBeNull();
      expect((await s.listTags({ ownerId: "u1" })).map((t) => t.id)).toEqual(["a"]);
      expect((await s.listTags({ moveId: "m1" })).map((t) => t.id)).toEqual(["a"]);
      const b = (await s.getTag("b"))!;
      expect(b).toMatchObject({ opensAt: "2027-01-01T00:00:00.000Z", pinHash: "x", privacy: "pin" });
      await s.updateTag({ ...b, title: "New", status: "archived", contents: ["x"] });
      expect(await s.getTag("b")).toMatchObject({ title: "New", status: "archived", contents: ["x"] });
    });

    it("media in order, replies newest first, scans", async () => {
      await s.insertUser(user("u1"));
      await s.insertTag(tag("a"));
      await s.insertTag(tag("b"));
      const m = (id: string, tagId: string, position: number) => ({ id, tagId, type: "photo" as const, mimeType: "image/png", size: 10, caption: "", position, file: `${tagId}/${id}.png`, createdAt: at });
      await s.insertMedia(m("m2", "a", 1));
      await s.insertMedia(m("m1", "a", 0));
      await s.insertMedia(m("m3", "b", 0));
      expect((await s.listMedia(["a"])).map((x) => x.id)).toEqual(["m1", "m2"]);
      await s.updateMedia({ ...(await s.getMedia("m1"))!, caption: "Hi", position: 5 });
      expect((await s.listMedia(["a"])).map((x) => x.id)).toEqual(["m2", "m1"]);
      await s.deleteMedia("m2");
      expect((await s.listMedia(["a", "b"])).map((x) => x.id).sort()).toEqual(["m1", "m3"]);

      await s.insertReply({ id: "r1", tagId: "a", name: "A", message: "old", read: false, createdAt: "2026-10-19T09:00:00.000Z" });
      await s.insertReply({ id: "r2", tagId: "a", name: "B", message: "new", read: false, createdAt: "2026-10-19T09:30:00.000Z" });
      expect((await s.listReplies(["a"])).map((r) => r.id)).toEqual(["r2", "r1"]);
      await s.markRepliesRead("a");
      expect((await s.listReplies(["a"])).every((r) => r.read)).toBe(true);
      await s.deleteReply("r1");
      expect(await s.getReply("r1")).toBeNull();

      await s.insertScan({ id: "s1", tagId: "a", visitorId: "v1", at });
      await s.insertScan({ id: "s2", tagId: "b", visitorId: null, at });
      expect((await s.listScans(["a"])).map((x) => x.visitorId)).toEqual(["v1"]);
    });

    it("PIN failures per visitor and unlocks", async () => {
      await s.insertUser(user("u1"));
      await s.insertTag(tag("a"));
      await s.insertPinFailure({ id: "f1", tagId: "a", visitorId: "v1", at });
      await s.insertPinFailure({ id: "f2", tagId: "a", visitorId: "v2", at });
      expect(await s.listPinFailures("a", "v1")).toHaveLength(1);
      await s.clearPinFailures("a", "v1");
      expect(await s.listPinFailures("a", "v1")).toHaveLength(0);
      expect(await s.listPinFailures("a", "v2")).toHaveLength(1);
      await s.insertUnlock({ token: "ul", tagId: "a", expiresAt: at });
      expect(await s.getUnlock("ul")).toEqual({ token: "ul", tagId: "a", expiresAt: at });
      await s.insertTag(tag("b"));
      await s.insertUnlock({ token: "ub", tagId: "b", expiresAt: at });
      await s.deleteUnlocks("a"); // #60
      expect(await s.getUnlock("ul")).toBeNull();
      expect(await s.getUnlock("ub")).not.toBeNull();
    });

    it("deleting a tag removes everything that belongs to it", async () => {
      await s.insertUser(user("u1"));
      await s.insertTag(tag("a"));
      await s.insertTag(tag("b"));
      await s.insertMedia({ id: "m1", tagId: "a", type: "photo", mimeType: "image/png", size: 1, caption: "", position: 0, file: "a/m1.png", createdAt: at });
      await s.insertReply({ id: "r1", tagId: "a", name: "A", message: "m", read: false, createdAt: at });
      await s.insertScan({ id: "s1", tagId: "a", visitorId: null, at });
      await s.insertPinFailure({ id: "f1", tagId: "a", visitorId: "v", at });
      await s.insertUnlock({ token: "ul", tagId: "a", expiresAt: at });
      await s.insertReply({ id: "r2", tagId: "b", name: "B", message: "m", read: false, createdAt: at });
      await s.deleteTag("a");
      expect(await s.getTag("a")).toBeNull();
      expect(await s.getMedia("m1")).toBeNull();
      expect(await s.listReplies(["a"])).toEqual([]);
      expect(await s.listScans(["a"])).toEqual([]);
      expect(await s.listPinFailures("a", "v")).toEqual([]);
      expect(await s.getUnlock("ul")).toBeNull();
      expect(await s.getReply("r2")).not.toBeNull();
    });
  });
}

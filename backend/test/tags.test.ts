import { existsSync } from "node:fs";
import { describe, it, expect } from "vitest";
import request from "supertest";
import { loginHeader, testApp } from "./helpers";

const gift = { kind: "gift", title: "For Mom", recipient: "Mom", message: "Line 1\nLine 2", privacy: "public", theme: "rose", allowReplies: true };
const box = (title: string, moveId = "m_astana") => ({ kind: "box", title, moveId, room: "Study", contents: [" Lamp ", "", "Books"], fragile: true, privacy: "public" });

describe("tags API (#26)", () => {
  it("creates a gift with a fresh code, reads it back, and lists it first", async () => {
    const { app } = await testApp();
    const auth = await loginHeader(app);
    const res = await request(app).post("/api/tags").set(auth).send({ ...gift, contents: ["ignored"], moveId: "m_astana", room: "x" });
    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
    expect(res.body).toMatchObject({ kind: "gift", title: "For Mom", recipient: "Mom", message: "Line 1\nLine 2", moveId: null, room: null, contents: [], boxNumber: null, status: "active", scanCount: 0, media: [] });
    const got = await request(app).get(`/api/tags/${res.body.id}`).set(auth);
    expect(got.body).toEqual(res.body);
    const list = await request(app).get("/api/tags").set(auth);
    expect(list.body[0].id).toBe(res.body.id);
    expect(list.body).toHaveLength(17);
  });

  it("numbers boxes after the seed's 12, keeps the number on edit, never reuses one", async () => {
    const { app } = await testApp();
    const auth = await loginHeader(app);
    const b13 = (await request(app).post("/api/tags").set(auth).send(box("Books"))).body;
    expect(b13).toMatchObject({ boxNumber: 13, contents: ["Lamp", "Books"], fragile: true, recipient: null, moveName: "Almaty → Astana" });
    const b14 = (await request(app).post("/api/tags").set(auth).send(box("Shoes"))).body;
    expect(b14.boxNumber).toBe(14);
    const edited = (await request(app).put(`/api/tags/${b13.id}`).set(auth).send({ ...box("Books and lamp"), room: "Office" })).body;
    expect(edited).toMatchObject({ boxNumber: 13, code: b13.code, title: "Books and lamp", room: "Office" });
    await request(app).delete(`/api/tags/${b14.id}`).set(auth).expect(204);
    expect((await request(app).post("/api/tags").set(auth).send(box("Plates"))).body.boxNumber).toBe(15);
    const toDacha = (await request(app).put(`/api/tags/${b13.id}`).set(auth).send(box("Books", "m_dacha"))).body;
    expect(toDacha.boxNumber).toBe(1);
  });

  it("validates like the mock", async () => {
    const { app, clock } = await testApp();
    const auth = await loginHeader(app);
    const bad = await request(app).post("/api/tags").set(auth).send({ kind: "box", title: "" });
    expect(bad.status).toBe(422);
    expect(bad.body.fields).toMatchObject({ title: "Title is required", moveId: "Choose a move for this box", room: "Room is required for a box" });
    const past = await request(app).post("/api/tags").set(auth).send({ ...gift, opensAt: new Date(clock.now.getTime() - 60_000).toISOString() });
    expect(past.body.fields).toEqual({ opensAt: "The open date must be in the future" });
    const noPin = await request(app).post("/api/tags").set(auth).send({ ...gift, privacy: "pin" });
    expect(noPin.body.fields).toEqual({ pin: "Set a PIN of 4 to 6 digits" });
    const badPin = await request(app).post("/api/tags").set(auth).send({ ...gift, privacy: "pin", pin: "12a4" });
    expect(badPin.body.fields).toEqual({ pin: "PIN must be 4 to 6 digits" });
    const otherMove = await request(app).post("/api/tags").set(await loginHeader(app, "dana@example.com")).send(box("Mine?"));
    expect(otherMove.body.fields).toEqual({ moveId: "Choose a move for this box" });
  });

  it("stores the PIN hashed, never returns it, and keeps it when no new PIN is sent", async () => {
    const { app, deps } = await testApp();
    const auth = await loginHeader(app);
    const t = (await request(app).post("/api/tags").set(auth).send({ ...gift, privacy: "pin", pin: "4321" })).body;
    expect(t.hasPin).toBe(true);
    expect(JSON.stringify(t)).not.toContain("4321");
    expect(t).not.toHaveProperty("pin");
    expect(t).not.toHaveProperty("pinHash");
    const before = (await deps.store.getTag(t.id))!.pinHash;
    expect(before).not.toBe("4321");
    await request(app).put(`/api/tags/${t.id}`).set(auth).send({ ...gift, privacy: "pin", pin: null }).expect(200);
    expect((await deps.store.getTag(t.id))!.pinHash).toBe(before);
    const pub = (await request(app).put(`/api/tags/${t.id}`).set(auth).send({ ...gift, privacy: "public" })).body;
    expect(pub.hasPin).toBe(false);
  });

  it("another owner's tag is a 404; no token is a 401", async () => {
    const { app } = await testApp();
    const dana = await loginHeader(app, "dana@example.com");
    for (const call of [
      request(app).get("/api/tags/t_keys").set(dana),
      request(app).put("/api/tags/t_keys").set(dana).send(gift),
      request(app).put("/api/tags/t_keys/archive").set(dana).send({ archived: true }),
      request(app).delete("/api/tags/t_keys").set(dana),
    ]) {
      const res = await call;
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("not_found");
    }
    expect((await request(app).get("/api/tags")).status).toBe(401);
    expect((await request(app).get("/api/tags").set(dana)).body.map((t: { code: string }) => t.code)).toEqual(["G5MK8WRT"]);
  });

  it("filters by text, kind, move and archived, and sorts by scans", async () => {
    const { app } = await testApp();
    const auth = await loginHeader(app);
    const get = async (qs: string) => (await request(app).get(`/api/tags?${qs}`).set(auth)).body as { title: string; kind: string; scanCount: number }[];
    expect((await get("q=KITCHEN")).map((t) => t.title)).toEqual(["Kitchen everyday"]);
    expect((await get("kind=keepsake")).every((t) => t.kind === "keepsake")).toBe(true);
    expect(await get("moveId=m_astana")).toHaveLength(12);
    expect((await get("archived=true")).map((t) => t.title)).toEqual(["Teacher's day flowers"]);
    const byScans = await get("sort=scans");
    expect(byScans.map((t) => t.scanCount)).toEqual([...byScans.map((t) => t.scanCount)].sort((a, b) => b - a));
    expect((await request(app).get("/api/tags?kind=car").set(auth)).status).toBe(422);
  });

  it("archives, unarchives and deletes with the tag's files", async () => {
    const { app, deps } = await testApp();
    const auth = await loginHeader(app);
    expect((await request(app).put("/api/tags/t_keys/archive").set(auth).send({ archived: true })).body.status).toBe("archived");
    expect((await request(app).get("/api/tags").set(auth)).body).toHaveLength(15);
    expect((await request(app).put("/api/tags/t_keys/archive").set(auth).send({ archived: false })).body.status).toBe("active");
    expect((await request(app).put("/api/tags/t_keys/archive").set(auth).send({})).status).toBe(422);
    const file = deps.files.abs((await deps.store.listMedia(["t_keys"]))[0].file);
    expect(existsSync(file)).toBe(true);
    await request(app).delete("/api/tags/t_keys").set(auth).expect(204);
    expect(existsSync(file)).toBe(false);
    expect((await request(app).get("/api/tags/t_keys").set(auth)).status).toBe(404);
    expect(await deps.store.listReplies(["t_keys"])).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";
import request from "supertest";
import { loginHeader, testApp } from "./helpers";

const V1 = { "X-Visitor-Id": "visitor-one" };
const V2 = { "X-Visitor-Id": "visitor-two" };

describe("public API (#28)", () => {
  it("returns each state of the seed tags", async () => {
    const { app } = await testApp();
    const get = async (code: string) => (await request(app).get(`/api/public/tags/${code}`).set(V1)).body;
    expect(await get("ZZZZ2222")).toEqual({ state: "unknown" });
    expect(await get("V3CT7NWB")).toEqual({ state: "archived" });
    expect(await get("S6ZE3VKA")).toEqual({ state: "private" });
    expect(await get("D8RW5TQN")).toEqual({ state: "pinRequired", theme: expect.any(String), attemptsLeft: 5, lockedUntil: null });
    const open = await get("7kq4 m2xp");
    expect(open.state).toBe("open");
    expect(open.preview).toBe(false);
    expect(open.tag).toMatchObject({ code: "7KQ4M2XP", title: "Keys to your first home" });
    expect(open.tag.media).toHaveLength(4);
    expect(open.tag.media[0].url).toMatch(/sig=/);
    expect(open.tag).not.toHaveProperty("pinHash");
    const box = await get("M5ZT3XCG");
    expect(box.tag).toMatchObject({ boxNumber: 7, room: "Kitchen", fragile: true, moveName: "Almaty → Astana" });
  });

  it("sends nothing but the cover before the open date", async () => {
    const { app } = await testApp();
    const res = await request(app).get("/api/public/tags/P4XH9M3K").set(V1);
    expect(res.body.state).toBe("timeLocked");
    expect(Object.keys(res.body).sort()).toEqual(["opensAt", "recipient", "state", "theme", "title"]);
    expect(res.text).not.toMatch(/message|media|\/api\/media/);
  });

  it("the owner gets a preview of private and locked tags", async () => {
    const { app } = await testApp();
    const auth = await loginHeader(app);
    for (const code of ["S6ZE3VKA", "P4XH9M3K", "D8RW5TQN"]) {
      const res = (await request(app).get(`/api/public/tags/${code}`).set(auth)).body;
      expect(res).toMatchObject({ state: "open", preview: true });
    }
    const dana = await loginHeader(app, "dana@example.com");
    expect((await request(app).get("/api/public/tags/S6ZE3VKA").set(dana)).body).toEqual({ state: "private" });
  });

  it("wrong PINs count down, the 5th locks this visitor only, the right PIN opens for 24 hours", async () => {
    const { app, advance } = await testApp();
    const unlock = (pin: string, v = V1) => request(app).post("/api/public/tags/D8RW5TQN/unlock").set(v).send({ pin });
    for (let left = 4; left >= 1; left--) {
      const r = await unlock("0000");
      expect(r.status).toBe(403);
      expect(r.body).toMatchObject({ code: "wrong_pin", attemptsLeft: left, message: `Wrong PIN. ${left} ${left === 1 ? "attempt" : "attempts"} left` });
    }
    const locked = await unlock("0000");
    expect(locked.status).toBe(423);
    expect(locked.body).toMatchObject({ code: "locked", attemptsLeft: 0, lockedUntil: expect.any(String) });
    expect((await unlock("1971")).status).toBe(423);
    expect((await request(app).get("/api/public/tags/D8RW5TQN").set(V1)).body).toMatchObject({ attemptsLeft: 0, lockedUntil: locked.body.lockedUntil });
    const other = await unlock("1971", V2);
    expect(other.status).toBe(200);
    const token = other.body.accessToken;
    const opened = await request(app).get("/api/public/tags/D8RW5TQN").set({ ...V2, "X-Unlock-Token": token });
    expect(opened.body).toMatchObject({ state: "open", preview: false, tag: { title: "Grandpa Serik's dombra" } });
    expect((await request(app).get("/api/public/tags/G5MK8WRT").set({ ...V2, "X-Unlock-Token": token })).body.state).toBe("pinRequired");
    advance(16 * 60_000);
    expect((await unlock("1971")).status).toBe(200);
    advance(24 * 3_600_000);
    expect((await request(app).get("/api/public/tags/D8RW5TQN").set({ ...V2, "X-Unlock-Token": token })).body.state).toBe("pinRequired");
  });

  it("validates the PIN and refuses to unlock tags that need no PIN", async () => {
    const { app } = await testApp();
    expect((await request(app).post("/api/public/tags/D8RW5TQN/unlock").set(V1).send({ pin: "12" })).status).toBe(422);
    expect((await request(app).post("/api/public/tags/7KQ4M2XP/unlock").set(V1).send({ pin: "1234" })).body.code).toBe("not_pin_protected");
    expect((await request(app).post("/api/public/tags/ZZZZ2222/unlock").set(V1).send({ pin: "1234" })).status).toBe(404);
  });

  it("counts one scan per visitor per 30 minutes and none for the owner", async () => {
    const { app, advance } = await testApp();
    const auth = await loginHeader(app);
    const scans = async () => (await request(app).get("/api/tags/t_keys").set(auth)).body.scanCount as number;
    const before = await scans();
    await request(app).get("/api/public/tags/7KQ4M2XP").set(V1);
    await request(app).get("/api/public/tags/7KQ4M2XP").set(V1);
    await request(app).get("/api/public/tags/7KQ4M2XP").set(auth);
    expect(await scans()).toBe(before + 1);
    await request(app).get("/api/public/tags/7KQ4M2XP").set(V2);
    expect(await scans()).toBe(before + 2);
    advance(31 * 60_000);
    await request(app).get("/api/public/tags/7KQ4M2XP").set(V1);
    expect(await scans()).toBe(before + 3);
    const dombra = async () => (await request(app).get("/api/tags/t_dombra").set(auth)).body.scanCount as number;
    const locked = await dombra();
    await request(app).get("/api/public/tags/D8RW5TQN").set(V1); // PIN form, not a scan
    expect(await dombra()).toBe(locked);
  });

  it("a new PIN or leaving PIN privacy ends earlier unlocks; keeping the PIN does not (#60)", async () => {
    const { app } = await testApp();
    const auth = await loginHeader(app);
    const dombra = { kind: "keepsake", title: "Grandpa Serik's dombra", message: "Do not glue it.", theme: "sage", privacy: "pin" };
    const unlockWith = async (pin: string) => (await request(app).post("/api/public/tags/D8RW5TQN/unlock").set(V2).send({ pin })).body.accessToken as string;
    const view = async (token: string) => (await request(app).get("/api/public/tags/D8RW5TQN").set({ ...V2, "X-Unlock-Token": token })).body.state;
    const save = (input: object) => request(app).put("/api/tags/t_dombra").set(auth).send(input).expect(200);

    let token = await unlockWith("1971");
    await save({ ...dombra, title: "Dombra" }); // PIN kept
    expect(await view(token)).toBe("open");

    await save({ ...dombra, pin: "5555" }); // new PIN
    expect(await view(token)).toBe("pinRequired");
    expect((await request(app).post("/api/public/tags/D8RW5TQN/unlock").set(V2).send({ pin: "1971" })).status).toBe(403);
    token = await unlockWith("5555");
    expect(await view(token)).toBe("open");

    await save({ ...dombra, privacy: "public" });
    await save({ ...dombra, pin: "5555" }); // back to PIN, even with the same digits
    expect(await view(token)).toBe("pinRequired");
  });
});

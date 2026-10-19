import { describe, it, expect } from "vitest";
import request from "supertest";
import { loginHeader, testApp } from "./helpers";

const V = { "X-Visitor-Id": "visitor-one" };
const reply = { name: "Vika", message: "Thank you!" };

describe("replies API (#29)", () => {
  it("a visitor replies to an open tag; the owner sees it unread, marks read, deletes", async () => {
    const { app } = await testApp();
    const sent = await request(app).post("/api/public/tags/7KQ4M2XP/replies").set(V).send({ name: "  Vika ", message: " Thank you! " });
    expect(sent.status).toBe(201);
    expect(sent.body).toMatchObject({ name: "Vika", message: "Thank you!", read: false });
    const auth = await loginHeader(app);
    const list = (await request(app).get("/api/tags/t_keys/replies").set(auth)).body;
    expect(list[0].id).toBe(sent.body.id);
    expect(list).toHaveLength(3);
    expect((await request(app).get("/api/tags/t_keys").set(auth)).body.unreadReplies).toBe(2);
    await request(app).post("/api/tags/t_keys/replies/read").set(auth).expect(204);
    expect((await request(app).get("/api/tags/t_keys").set(auth)).body.unreadReplies).toBe(0);
    await request(app).delete(`/api/tags/t_keys/replies/${sent.body.id}`).set(auth).expect(204);
    expect((await request(app).get("/api/tags/t_keys/replies").set(auth)).body).toHaveLength(2);
    expect((await request(app).delete(`/api/tags/t_keys/replies/${sent.body.id}`).set(auth)).status).toBe(404);
  });

  it("refuses replies when the tag is not open to the visitor or replies are off", async () => {
    const { app } = await testApp();
    const send = (code: string, headers: Record<string, string> = V) => request(app).post(`/api/public/tags/${code}/replies`).set(headers).send(reply);
    expect((await send("D8RW5TQN")).body.code).toBe("replies_closed");
    expect((await send("S6ZE3VKA")).status).toBe(403);
    expect((await send("P4XH9M3K")).status).toBe(403);
    expect((await send("M5ZT3XCG")).status).toBe(403); // boxes have replies off
    expect((await send("ZZZZ2222")).status).toBe(404);
    expect((await send("G5MK8WRT")).status).toBe(403); // PIN tag with replies on, not unlocked yet
    const { accessToken } = (await request(app).post("/api/public/tags/G5MK8WRT/unlock").set(V).send({ pin: "2468" })).body;
    expect((await send("G5MK8WRT", { ...V, "X-Unlock-Token": accessToken })).status).toBe(201);
    const bad = await send("7KQ4M2XP").send({ name: "", message: "x".repeat(1001) });
    expect(bad.status).toBe(422);
  });

  it("allows 10 replies per tag per hour", async () => {
    const { app, advance } = await testApp();
    const send = () => request(app).post("/api/public/tags/7KQ4M2XP/replies").set(V).send(reply);
    for (let i = 0; i < 10; i++) await send().expect(201);
    const eleventh = await send();
    expect(eleventh.status).toBe(429);
    expect(eleventh.body).toEqual({ code: "too_many_replies", message: "Too many replies right now. Try again later." });
    advance(61 * 60_000);
    expect((await send()).status).toBe(201);
  });

  it("other owners get 404 for the owner endpoints", async () => {
    const { app } = await testApp();
    const dana = await loginHeader(app, "dana@example.com");
    expect((await request(app).get("/api/tags/t_keys/replies").set(dana)).status).toBe(404);
    expect((await request(app).post("/api/tags/t_keys/replies/read").set(dana)).status).toBe(404);
    expect((await request(app).get("/api/tags/t_keys/replies")).status).toBe(401);
  });
});

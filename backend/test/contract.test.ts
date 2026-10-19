import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { contractCheck, covered, operations, violations } from "./contract";
import { loginHeader, testApp } from "./helpers";

const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");

describe("contract (#32)", () => {
  it("every operation in openapi.yaml has a route, and every response matches its schema", async () => {
    const { app } = await testApp();
    const V = { "X-Visitor-Id": "contract-tour" };
    await request(app).get("/api/health");
    const signup = await request(app).post("/api/auth/signup").send({ name: "Tour", email: "tour@example.com", password: "password1" });
    const tour = { Authorization: `Bearer ${signup.body.token}` };
    await request(app).get("/api/auth/me").set(tour);
    await request(app).post("/api/auth/logout").set(tour);
    const auth = await loginHeader(app);

    const move = (await request(app).post("/api/moves").set(auth).send({ name: "Tour move" })).body;
    await request(app).get("/api/moves").set(auth);
    await request(app).get(`/api/moves/${move.id}`).set(auth);
    await request(app).put(`/api/moves/${move.id}`).set(auth).send({ name: "Tour move 2" });
    await request(app).get("/api/moves/m_astana/search?q=kettle").set(auth);

    const tag = (await request(app).post("/api/tags").set(auth).send({ kind: "box", title: "Tour box", moveId: move.id, room: "Hall" })).body;
    await request(app).get("/api/tags?sort=scans").set(auth);
    await request(app).get(`/api/tags/${tag.id}`).set(auth);
    await request(app).put(`/api/tags/${tag.id}`).set(auth).send({ kind: "box", title: "Tour box 2", moveId: move.id, room: "Hall", allowReplies: true });
    await request(app).put(`/api/tags/${tag.id}/archive`).set(auth).send({ archived: false });
    await request(app).get("/api/stats").set(auth);

    const m1 = (await request(app).post(`/api/tags/${tag.id}/media`).set(auth).attach("file", PNG, { filename: "a.png", contentType: "image/png" })).body;
    const m2 = (await request(app).post(`/api/tags/${tag.id}/media`).set(auth).attach("file", PNG, { filename: "b.png", contentType: "image/png" })).body;
    await request(app).patch(`/api/tags/${tag.id}/media/${m1.id}`).set(auth).send({ caption: "Tour" });
    await request(app).put(`/api/tags/${tag.id}/media/order`).set(auth).send({ mediaIds: [m2.id, m1.id] });
    await request(app).get(m1.url);
    await request(app).delete(`/api/tags/${tag.id}/media/${m2.id}`).set(auth);

    await request(app).get(`/api/public/tags/${tag.code}`).set(V);
    await request(app).post("/api/public/tags/D8RW5TQN/unlock").set(V).send({ pin: "1971" });
    const reply = (await request(app).post(`/api/public/tags/${tag.code}/replies`).set(V).send({ name: "Tour", message: "Hi" })).body;
    await request(app).get(`/api/tags/${tag.id}/replies`).set(auth);
    await request(app).post(`/api/tags/${tag.id}/replies/read`).set(auth);
    await request(app).delete(`/api/tags/${tag.id}/replies/${reply.id}`).set(auth);

    await request(app).delete(`/api/tags/${tag.id}`).set(auth);
    await request(app).delete(`/api/moves/${move.id}`).set(auth);

    const missing = operations.map((o) => o.id).filter((id) => !covered.has(id));
    expect(missing).toEqual([]);
  });

  it("catches a response that drifts from the contract", async () => {
    const app = express().use(contractCheck);
    app.get("/api/stats", (_req, res) => {
      res.json({ tags: 1, scansThisWeek: 2, unreadReply: 0 }); // renamed field
    });
    app.get("/api/tags", (_req, res) => {
      res.status(418).json([]);
    });
    await request(app).get("/api/stats");
    await request(app).get("/api/tags");
    const found = violations.splice(0);
    expect(found).toHaveLength(2);
    expect(found[0]).toMatch(/^getStats 200: .*unreadReplies/);
    expect(found[1]).toMatch(/^listTags: status 418 is not documented/);
  });
});

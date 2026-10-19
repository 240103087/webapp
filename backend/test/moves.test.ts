import { describe, it, expect } from "vitest";
import request from "supertest";
import { loginHeader, testApp } from "./helpers";

describe("moves API (#30)", () => {
  it("lists moves newest first with box counts", async () => {
    const { app } = await testApp();
    const list = (await request(app).get("/api/moves").set(await loginHeader(app))).body;
    expect(list.map((m: { id: string; boxCount: number }) => [m.id, m.boxCount])).toEqual([["m_dacha", 0], ["m_astana", 12]]);
    expect((await request(app).get("/api/moves").set(await loginHeader(app, "dana@example.com"))).body).toEqual([]);
  });

  it("creates, updates and deletes an empty move; refuses to delete one with boxes", async () => {
    const { app } = await testApp();
    const auth = await loginHeader(app);
    const created = await request(app).post("/api/moves").set(auth).send({ name: " Dorm to flat ", fromAddress: "", date: "2026-12-01" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: "Dorm to flat", fromAddress: null, toAddress: null, date: "2026-12-01", boxCount: 0 });
    const bad = await request(app).post("/api/moves").set(auth).send({ name: "", date: "2026-13-45" });
    expect(bad.status).toBe(422);
    expect(bad.body.fields).toMatchObject({ name: "Name is required", date: "Enter a valid date" });
    const upd = await request(app).put(`/api/moves/${created.body.id}`).set(auth).send({ name: "Dorm → flat", toAddress: "Satpaev 22" });
    expect(upd.body).toMatchObject({ name: "Dorm → flat", toAddress: "Satpaev 22", date: null });
    await request(app).delete(`/api/moves/${created.body.id}`).set(auth).expect(204);
    const full = await request(app).delete("/api/moves/m_astana").set(auth);
    expect(full.status).toBe(409);
    expect(full.body.code).toBe("move_not_empty");
  });

  it("groups boxes by room, sorted, with full tags", async () => {
    const { app } = await testApp();
    const m = (await request(app).get("/api/moves/m_astana").set(await loginHeader(app))).body;
    expect(m.boxCount).toBe(12);
    const rooms = m.rooms.map((r: { room: string }) => r.room);
    expect(rooms).toContain("Kitchen");
    const kitchen = m.rooms.find((r: { room: string }) => r.room === "Kitchen");
    expect(kitchen.boxes.map((b: { boxNumber: number }) => b.boxNumber)).toEqual([...kitchen.boxes.map((b: { boxNumber: number }) => b.boxNumber)].sort((a, b) => a - b));
    expect(kitchen.boxes[0]).toHaveProperty("scanCount");
  });

  it("finds the kettle", async () => {
    const { app } = await testApp();
    const auth = await loginHeader(app);
    const hits = (await request(app).get("/api/moves/m_astana/search?q=Kettle").set(auth)).body;
    expect(hits.map((h: { boxNumber: number; matches: string[] }) => [h.boxNumber, h.matches])).toEqual([[7, ["Electric kettle"]], [9, ["Kettle descaler"]]]);
    expect((await request(app).get("/api/moves/m_astana/search?q=").set(auth)).body).toEqual([]);
    expect((await request(app).get("/api/moves/m_astana/search?q=zzzz").set(auth)).body).toEqual([]);
  });

  it("other owners get 404", async () => {
    const { app } = await testApp();
    const dana = await loginHeader(app, "dana@example.com");
    expect((await request(app).get("/api/moves/m_astana").set(dana)).status).toBe(404);
    expect((await request(app).get("/api/moves/m_astana/search?q=kettle").set(dana)).status).toBe(404);
    expect((await request(app).delete("/api/moves/m_dacha").set(dana)).status).toBe(404);
  });
});

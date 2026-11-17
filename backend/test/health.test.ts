import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import { HttpError } from "../src/errors";
import { testApp } from "./helpers";

const app = async () => (await testApp({ config: { seed: false } })).app;

describe("skeleton (#23)", () => {
  it("answers the health check", async () => {
    const res = await request(await app()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, environment: "local", version: "local" });
  });

  it("reports the environment and version it runs (#101)", async () => {
    const { app } = await testApp({ config: { seed: false, appEnv: "dev", appVersion: "20261115-130501-abc1234" } });
    const res = await request(app).get("/api/health");
    expect(res.body).toEqual({ ok: true, environment: "dev", version: "20261115-130501-abc1234" });
  });

  it("unknown api route is a 404 in the error format", async () => {
    const res = await request(await app()).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ code: "not_found", message: "No route GET /api/nope" });
  });

  it("bad JSON is a 400 in the error format", async () => {
    const res = await request(await app()).post("/api/nope").set("Content-Type", "application/json").send("{oops");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("bad_json");
  });

  it("HttpError keeps its status and extras; other errors are a 500 without details", async () => {
    const { errorHandler } = await import("../src/errors");
    const a = express();
    a.get("/a", () => { throw new HttpError(423, "locked", "Locked", { lockedUntil: "2026-10-19T12:00:00.000Z" }); });
    a.get("/b", () => { throw new Error("secret detail"); });
    a.use(errorHandler);
    const r1 = await request(a).get("/a");
    expect(r1.status).toBe(423);
    expect(r1.body).toEqual({ code: "locked", message: "Locked", lockedUntil: "2026-10-19T12:00:00.000Z" });
    const err = console.error; console.error = () => {};
    const r2 = await request(a).get("/b");
    console.error = err;
    expect(r2.status).toBe(500);
    expect(JSON.stringify(r2.body)).not.toContain("secret");
  });
});

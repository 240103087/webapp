import { describe, it, expect } from "vitest";
import request from "supertest";
import { AggregationTemporality, MeterProvider, MetricReader, type DataPoint, type Histogram } from "@opentelemetry/sdk-metrics";
import { violations } from "./contract";
import { loginHeader, testApp } from "./helpers";

/** Collects the app's metrics on demand, without the SDK or a network (#104). */
class TestReader extends MetricReader {
  constructor() {
    super({ aggregationTemporalitySelector: () => AggregationTemporality.CUMULATIVE });
  }
  protected async onShutdown() {}
  protected async onForceFlush() {}

  /** Every data point of one metric, as `{ attributes, value }`. */
  async points(name: string): Promise<DataPoint<number | Histogram>[]> {
    const { resourceMetrics } = await this.collect();
    return resourceMetrics.scopeMetrics.flatMap((s) => s.metrics).filter((m) => m.descriptor.name === name).flatMap((m) => m.dataPoints as DataPoint<number | Histogram>[]);
  }

  /** The value of the counter point whose attributes include `attrs`. */
  async value(name: string, attrs: Record<string, string> = {}): Promise<number> {
    const p = (await this.points(name)).filter((d) => Object.entries(attrs).every(([k, v]) => d.attributes[k] === v));
    return p.reduce((sum, d) => sum + (d.value as number), 0);
  }
}

async function setup() {
  const reader = new TestReader();
  const meter = new MeterProvider({ readers: [reader] }).getMeter("test");
  const t = await testApp({ meter, config: { appEnv: "dev", appVersion: "20261115-130501-abc1234" } });
  return { ...t, reader, auth: await loginHeader(t.app) };
}

const V = { "X-Visitor-Id": "visitor-one" };
const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");

describe("MoveEasy metrics (#104)", () => {
  it("counts created tags by kind, with the environment and version on every point", async () => {
    const { app, auth, reader } = await setup();
    await request(app).post("/api/tags").set(auth).send({ kind: "gift", title: "For Mom", recipient: "Mom", message: "Hi", privacy: "public", theme: "rose", allowReplies: true }).expect(201);
    const [point] = await reader.points("moveeasy.tags.created");
    expect(point.attributes).toEqual({ environment: "dev", version: "20261115-130501-abc1234", kind: "gift" });
    expect(point.value).toBe(1);
  });

  it("counts public views by state and counted scans", async () => {
    const { app, reader } = await setup();
    await request(app).get("/api/public/tags/7KQ4M2XP").set(V);
    await request(app).get("/api/public/tags/7KQ4M2XP").set(V); // the same visitor within 30 minutes: not a new scan
    await request(app).get("/api/public/tags/ZZZZ2222").set(V);
    await request(app).get("/api/public/tags/D8RW5TQN").set(V);
    expect(await reader.value("moveeasy.tag.views", { state: "open" })).toBe(2);
    expect(await reader.value("moveeasy.tag.views", { state: "unknown" })).toBe(1);
    expect(await reader.value("moveeasy.tag.views", { state: "pinRequired" })).toBe(1);
    expect(await reader.value("moveeasy.tag.scans")).toBe(1);
  });

  it("counts PIN attempts: wrong, the one that locks, blocked while locked, and ok", async () => {
    const { app, reader } = await setup();
    const unlock = (pin: string, v = V) => request(app).post("/api/public/tags/D8RW5TQN/unlock").set(v).send({ pin });
    for (let i = 0; i < 5; i++) await unlock("0000");
    await unlock("1971");
    await unlock("1971", { "X-Visitor-Id": "visitor-two" });
    expect(await reader.value("moveeasy.pin.attempts", { result: "wrong" })).toBe(4);
    expect(await reader.value("moveeasy.pin.attempts", { result: "locked_out" })).toBe(1);
    expect(await reader.value("moveeasy.pin.attempts", { result: "blocked" })).toBe(1);
    expect(await reader.value("moveeasy.pin.attempts", { result: "ok" })).toBe(1);
  });

  it("counts uploads by type and result, and records the size of accepted ones", async () => {
    const { app, auth, reader } = await setup();
    await request(app).post("/api/tags/t_birthday/media").set(auth).attach("file", PNG, { filename: "a.png", contentType: "image/png" }).expect(201);
    await request(app).post("/api/tags/t_birthday/media").set(auth).attach("file", Buffer.from("%PDF"), { filename: "a.pdf", contentType: "application/pdf" }).expect(422);
    expect(await reader.value("moveeasy.media.uploads", { type: "photo", result: "ok" })).toBe(1);
    expect(await reader.value("moveeasy.media.uploads", { result: "bad_file" })).toBe(1);
    const [size] = await reader.points("moveeasy.media.upload.size");
    expect((size.value as Histogram).sum).toBe(PNG.length);
  });

  it("counts replies, sign-ups and log-ins", async () => {
    const { app, reader } = await setup();
    await request(app).post("/api/public/tags/7KQ4M2XP/replies").set(V).send({ name: "Vika", message: "Thank you!" }).expect(201);
    await request(app).post("/api/auth/signup").send({ name: "New", email: "new@example.com", password: "password123" }).expect(201);
    await request(app).post("/api/auth/login").send({ email: "aigerim@example.com", password: "nope-nope" }).expect(401);
    expect(await reader.value("moveeasy.replies.created")).toBe(1);
    expect(await reader.value("moveeasy.users.signups")).toBe(1);
    expect(await reader.value("moveeasy.users.logins", { result: "ok" })).toBe(1); // setup() logs in once
    expect(await reader.value("moveeasy.users.logins", { result: "bad_credentials" })).toBe(1);
  });

  it("counts unexpected server errors by route template, not expected 4xx answers", async () => {
    const { app, auth, deps, reader } = await setup();
    await request(app).get("/api/tags/nope").set(auth).expect(404);
    deps.store.insertTag = () => Promise.reject(new Error("database is down"));
    const err = console.error; console.error = () => {};
    await request(app).post("/api/tags").set(auth).send({ kind: "gift", title: "For Mom", recipient: "Mom", message: "Hi", privacy: "public", theme: "rose", allowReplies: true }).expect(500);
    console.error = err;
    violations.splice(0); // the 500 is the point of this test, openapi.yaml rightly does not list it
    const points = (await reader.points("moveeasy.operation.failures")).filter((p) => p.value !== 0);
    expect(points.map((p) => [p.attributes.operation, p.value])).toEqual([["POST /api/tags", 1]]);
  });

  it("starts the known series at 0, with one failure series per API route, so the first failure shows in increase() (#105)", async () => {
    const { reader } = await setup();
    const ops = (await reader.points("moveeasy.operation.failures")).map((p) => p.attributes.operation);
    expect(ops).toEqual(expect.arrayContaining(["POST /api/tags", "GET /api/public/tags/:code", "POST /api/tags/:tagId/media", "POST /api/auth/login"]));
    expect(await reader.value("moveeasy.operation.failures")).toBe(0);
    expect((await reader.points("moveeasy.tags.created")).map((p) => p.attributes.kind).sort()).toEqual(["box", "gift", "keepsake"]);
  });

  it("the in-flight gauge goes back to zero; request time is recorded by route template", async () => {
    const { app, reader } = await setup();
    await request(app).get("/api/public/tags/7KQ4M2XP").set(V);
    expect(await reader.value("moveeasy.http.requests.in_flight")).toBe(0);
    const time = (await reader.points("moveeasy.http.request.duration")).find((p) => p.attributes.operation === "GET /api/public/tags/:code");
    expect(time?.attributes.status_class).toBe("2xx");
    expect((time?.value as Histogram).count).toBe(1);
  });
});

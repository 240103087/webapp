import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";
import request from "supertest";
import { testApp } from "./helpers";

function builtFrontend(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "moveeasy-dist-"));
  mkdirSync(path.join(dir, "assets"));
  writeFileSync(path.join(dir, "index.html"), "<!doctype html><div id=root></div>");
  writeFileSync(path.join(dir, "assets", "index-abc123.js"), "console.log(1)");
  writeFileSync(path.join(dir, "favicon.svg"), "<svg/>");
  return dir;
}

describe("serving the built frontend (#38)", () => {
  it("serves index.html for client routes and the API on the same port", async () => {
    const { app } = await testApp({ config: { staticDir: builtFrontend() } });
    for (const route of ["/", "/t/7KQ4M2XP", "/moves/m_astana?q=kettle", "/login"]) {
      const res = await request(app).get(route);
      expect(res.status, route).toBe(200);
      expect(res.text).toContain("<div id=root>");
      expect(res.headers["cache-control"]).toBe("no-cache");
    }
    const view = await request(app).get("/api/public/tags/7KQ4M2XP");
    expect(view.body.state).toBe("open");
  });

  it("caches hashed assets, 404s missing ones, and keeps API 404s in JSON", async () => {
    const { app } = await testApp({ config: { staticDir: builtFrontend() } });
    const js = await request(app).get("/assets/index-abc123.js");
    expect(js.status).toBe(200);
    expect(js.headers["cache-control"]).toContain("immutable");
    expect((await request(app).get("/assets/old-999.js")).status).toBe(404);
    expect((await request(app).get("/favicon.svg")).status).toBe(200);
    const api = await request(app).get("/api/nope");
    expect(api.status).toBe(404);
    expect(api.body.code).toBe("not_found");
  });

  it("refuses to start without a build", async () => {
    await expect(testApp({ config: { staticDir: mkdtempSync(path.join(os.tmpdir(), "empty-")) } })).rejects.toThrow(/npm run build/);
  });
});

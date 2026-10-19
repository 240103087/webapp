import { describe, it, expect } from "vitest";
import request from "supertest";
import { SEED_TAGS } from "@moveeasy/shared";
import { loginHeader, testApp } from "./helpers";

describe("stats API (#31)", () => {
  it("matches the seed: active tags, scans in the last 7 days, unread replies", async () => {
    const { app } = await testApp();
    const mine = SEED_TAGS.filter((t) => t.owner === "u_aigerim");
    // Seed scans happen `d` days and one hour before now; the last 7 days are d < 7.
    const expected = {
      tags: mine.filter((t) => !t.archived).length,
      scansThisWeek: mine.flatMap((t) => t.scansDaysAgo).filter((d) => d < 7).length,
      unreadReplies: mine.flatMap((t) => t.replies).filter((r) => !r.read).length,
    };
    expect(expected.tags).toBe(16);
    const res = await request(app).get("/api/stats").set(await loginHeader(app));
    expect(res.body).toEqual(expected);
  });

  it("moves with a visitor's scan and with marking replies read", async () => {
    const { app } = await testApp();
    const auth = await loginHeader(app);
    const before = (await request(app).get("/api/stats").set(auth)).body;
    await request(app).get("/api/public/tags/7KQ4M2XP").set("X-Visitor-Id", "v-stats");
    await request(app).post("/api/tags/t_keys/replies/read").set(auth);
    const after = (await request(app).get("/api/stats").set(auth)).body;
    expect(after).toEqual({ tags: before.tags, scansThisWeek: before.scansThisWeek + 1, unreadReplies: 0 });
    expect((await request(app).get("/api/stats")).status).toBe(401);
    expect((await request(app).get("/api/stats").set(await loginHeader(app, "dana@example.com"))).body).toEqual({ tags: 1, scansThisWeek: expect.any(Number), unreadReplies: expect.any(Number) });
  });

  it("each tag in the list carries its own counts and cover", async () => {
    const { app } = await testApp();
    const keys = (await request(app).get("/api/tags").set(await loginHeader(app))).body.find((t: { code: string }) => t.code === "7KQ4M2XP");
    expect(keys).toMatchObject({ scanCount: 8, replyCount: 2, unreadReplies: 1, lastScanAt: expect.any(String) });
    expect(keys.coverUrl).toBe(keys.media[0].url);
  });
});

import { existsSync, readFileSync, rmSync } from "node:fs";
import { describe, it, expect } from "vitest";
import request from "supertest";
import { loginHeader, testApp } from "./helpers";

const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");

async function setup() {
  const t = await testApp();
  return { ...t, auth: await loginHeader(t.app) };
}

describe("media API (#27)", () => {
  it("uploads a photo, returns a signed URL that serves the same bytes", async () => {
    const { app, auth, deps } = await setup();
    const res = await request(app).post("/api/tags/t_birthday/media").set(auth).field("caption", "  Cake  ").attach("file", PNG, { filename: "a.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ type: "photo", mimeType: "image/png", size: PNG.length, caption: "Cake", position: 1 });
    expect(res.body.url).toMatch(/^\/api\/media\/m_[\w-]+\/file\?exp=\d+&sig=[\w-]+$/);
    const file = await request(app).get(res.body.url).buffer(true).parse((r, cb) => { const c: Buffer[] = []; r.on("data", (d: Buffer) => c.push(d)); r.on("end", () => cb(null, Buffer.concat(c))); });
    expect(file.status).toBe(200);
    expect(file.headers["content-type"]).toBe("image/png");
    expect(Buffer.compare(file.body, PNG)).toBe(0);
    const row = (await deps.store.getMedia(res.body.id))!;
    expect(readFileSync(deps.files.abs(row.file)).equals(PNG)).toBe(true);
    const tag = (await request(app).get("/api/tags/t_birthday").set(auth)).body;
    expect(tag.media.map((m: { id: string }) => m.id)).toContain(res.body.id);
  });

  it("accepts audio with codec parameters and keeps the base type", async () => {
    const { app, auth } = await setup();
    const res = await request(app).post("/api/tags/t_birthday/media").set(auth).attach("file", Buffer.from("OggS fake"), { filename: "voice.webm", contentType: "audio/webm;codecs=opus" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ type: "audio", mimeType: "audio/webm" });
  });

  it("refuses tampered or expired links, supports Range", async () => {
    const { app, clock } = await setup();
    const { url } = (await request(app).get("/api/tags/t_keys").set(await loginHeader(app))).body.media[0];
    const tampered = await request(app).get(url.replace(/sig=.{4}/, "sig=AAAA"));
    expect(tampered.status).toBe(403);
    expect(tampered.body.code).toBe("bad_signature");
    const part = await request(app).get(url).set("Range", "bytes=0-9");
    expect(part.status).toBe(206);
    expect(part.headers["content-length"]).toBe("10");
    expect(part.headers["content-range"]).toMatch(/^bytes 0-9\/\d+$/);
    clock.now = new Date(clock.now.getTime() + 26 * 3_600_000);
    expect((await request(app).get(url)).status).toBe(403);
  });

  it("refuses bad files with the mock's messages", async () => {
    const { app, auth } = await setup();
    const pdf = await request(app).post("/api/tags/t_birthday/media").set(auth).attach("file", Buffer.from("%PDF"), { filename: "a.pdf", contentType: "application/pdf" });
    expect(pdf.status).toBe(422);
    expect(pdf.body).toMatchObject({ code: "bad_file", message: "This file type is not supported. Use photos, videos or audio files" });
    const big = await request(app).post("/api/tags/t_birthday/media").set(auth).attach("file", Buffer.alloc(10 * 1024 * 1024 + 1), { filename: "big.jpg", contentType: "image/jpeg" });
    expect(big.status).toBe(413);
    expect(big.body).toMatchObject({ code: "too_big", message: "Too big. Photos (JPEG, PNG, WebP) up to 10 MB" });
    const none = await request(app).post("/api/tags/t_birthday/media").set(auth).field("caption", "x");
    expect(none.status).toBe(422);
    const stranger = await request(app).post("/api/tags/t_birthday/media").set(await loginHeader(app, "dana@example.com")).attach("file", PNG, { filename: "a.png", contentType: "image/png" });
    expect(stranger.status).toBe(404);
  });

  it("stops at 20 items per tag", async () => {
    const { app, auth } = await setup();
    for (let i = 0; i < 19; i++) await request(app).post("/api/tags/t_birthday/media").set(auth).attach("file", PNG, { filename: `${i}.png`, contentType: "image/png" }).expect(201);
    const res = await request(app).post("/api/tags/t_birthday/media").set(auth).attach("file", PNG, { filename: "21.png", contentType: "image/png" });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("too_many_media");
  });

  it("captions, reorders and deletes; delete removes the file and closes the gap", async () => {
    const { app, auth, deps } = await setup();
    const ids = (await request(app).get("/api/tags/t_keys").set(auth)).body.media.map((m: { id: string }) => m.id) as string[];
    expect(ids).toHaveLength(4);
    const cap = await request(app).patch(`/api/tags/t_keys/media/${ids[0]}`).set(auth).send({ caption: "New caption" });
    expect(cap.body.caption).toBe("New caption");
    expect((await request(app).patch(`/api/tags/t_keys/media/${ids[0]}`).set(auth).send({ caption: "x".repeat(201) })).status).toBe(422);
    const order = await request(app).put("/api/tags/t_keys/media/order").set(auth).send({ mediaIds: [...ids].reverse() });
    expect(order.body.map((m: { id: string }) => m.id)).toEqual([...ids].reverse());
    expect((await request(app).put("/api/tags/t_keys/media/order").set(auth).send({ mediaIds: ids.slice(1) })).status).toBe(422);
    const file = deps.files.abs((await deps.store.getMedia(ids[3]))!.file);
    await request(app).delete(`/api/tags/t_keys/media/${ids[3]}`).set(auth).expect(204);
    expect(existsSync(file)).toBe(false);
    const after = (await request(app).get("/api/tags/t_keys").set(auth)).body.media;
    expect(after.map((m: { position: number }) => m.position)).toEqual([0, 1, 2]);
    expect((await request(app).delete(`/api/tags/t_keys/media/${ids[3]}`).set(auth)).status).toBe(404);
  });

  it("uploads still work after the upload folder was deleted under the running server (#61)", async () => {
    const { app, auth, deps } = await setup();
    rmSync(deps.config.uploadDir, { recursive: true, force: true }); // what `npm run db:seed` does
    const res = await request(app).post("/api/tags/t_birthday/media").set(auth).attach("file", PNG, { filename: "a.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    const file = await request(app).get(res.body.url).buffer(true).parse((r, cb) => { const c: Buffer[] = []; r.on("data", (d: Buffer) => c.push(d)); r.on("end", () => cb(null, Buffer.concat(c))); });
    expect(file.status).toBe(200);
    expect(Buffer.compare(file.body, PNG)).toBe(0);
  });
});

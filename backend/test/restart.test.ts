import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, afterEach } from "vitest";

/** Starts `src/server.ts` as a real process and waits for the health check. */
async function startServer(env: Record<string, string>): Promise<{ proc: ChildProcess; base: string }> {
  const port = 18000 + Math.floor(Math.random() * 2000);
  const proc = spawn("npx", ["tsx", "src/server.ts"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, ...env, PORT: String(port), LOG: "0", NODE_ENV: "production" },
    stdio: "pipe",
  });
  let output = "";
  proc.stdout!.on("data", (d) => (output += d));
  proc.stderr!.on("data", (d) => (output += d));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 150; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return { proc, base };
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  proc.kill();
  throw new Error(`server did not start:\n${output}`);
}

const stop = (proc: ChildProcess) => new Promise<void>((resolve) => { proc.once("exit", () => resolve()); proc.kill("SIGTERM"); });

let running: ChildProcess | null = null;
afterEach(async () => {
  if (running && running.exitCode === null) await stop(running);
});

describe("data survives a restart (#35)", () => {
  it("keeps tags, media files and replies in SQLite and on disk", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "moveeasy-restart-"));
    const env = { STORE: "prisma", DATABASE_URL: `file:${path.join(dir, "app.db")}`, UPLOAD_DIR: path.join(dir, "uploads"), MEDIA_SECRET: "restart-secret" };

    let s = await startServer(env);
    running = s.proc;
    const login = await (await fetch(`${s.base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "aigerim@example.com", password: "password123" }) })).json();
    const auth = { Authorization: `Bearer ${login.token}` };
    const tag = await (await fetch(`${s.base}/api/tags`, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ kind: "gift", title: "Survives restarts", allowReplies: true }) })).json();
    const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
    const form = new FormData();
    form.append("file", new Blob([png], { type: "image/png" }), "p.png");
    const media = await (await fetch(`${s.base}/api/tags/${tag.id}/media`, { method: "POST", headers: auth, body: form })).json();
    expect(media.type).toBe("photo");
    await fetch(`${s.base}/api/public/tags/${tag.code}/replies`, { method: "POST", headers: { "content-type": "application/json", "X-Visitor-Id": "v" }, body: JSON.stringify({ name: "Vika", message: "Still here?" }) });
    await stop(s.proc);

    s = await startServer(env);
    running = s.proc;
    const again = await (await fetch(`${s.base}/api/tags/${tag.id}`, { headers: auth })).json();
    expect(again).toMatchObject({ title: "Survives restarts", code: tag.code, replyCount: 1 });
    expect(again.media).toHaveLength(1);
    const file = await fetch(`${s.base}${again.media[0].url}`);
    expect(file.status).toBe(200);
    expect(Buffer.from(await file.arrayBuffer()).equals(png)).toBe(true);
    const list = await (await fetch(`${s.base}/api/tags`, { headers: auth })).json();
    expect(list).toHaveLength(17); // 16 active seed tags + the new one: the seed did not run again
  }, 60_000);
});

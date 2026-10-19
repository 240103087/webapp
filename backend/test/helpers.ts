import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig, type Config } from "../src/config";

/** Config for tests: a fresh temporary upload folder, no request log. */
export function testConfig(overrides: Partial<Config> = {}): Config {
  return { ...loadConfig({ NODE_ENV: "test" }), uploadDir: mkdtempSync(path.join(os.tmpdir(), "moveeasy-")), log: false, ...overrides };
}

/** A fresh app with the seeded memory store and a clock the test can move. */
export async function testApp(opts: { now?: Date; config?: Partial<Config> } = {}) {
  const { buildDeps, createApp } = await import("../src/app");
  const clock = { now: opts.now ?? new Date("2026-10-19T10:00:00Z") };
  const deps = await buildDeps(testConfig(opts.config), () => clock.now);
  return { app: createApp(deps), deps, clock, advance: (ms: number) => (clock.now = new Date(clock.now.getTime() + ms)) };
}

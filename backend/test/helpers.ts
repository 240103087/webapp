import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig, type Config } from "../src/config";

/** Config for tests: a fresh temporary upload folder, no request log. */
export function testConfig(overrides: Partial<Config> = {}): Config {
  return { ...loadConfig({ NODE_ENV: "test" }), uploadDir: mkdtempSync(path.join(os.tmpdir(), "moveeasy-")), log: false, ...overrides };
}

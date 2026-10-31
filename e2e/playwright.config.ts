import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
/** A fresh database and upload folder for every run; deleted before the server starts. */
const data = path.join(here, ".data");
const PORT = 8788;
/**
 * E2E_BASE_URL runs the tests against an app that is already running (the Compose stack or a
 * deployed site) instead of starting one (#73). E2E_STACK=1 adds the integration tests in ./stack.
 */
const external = process.env.E2E_BASE_URL;
const stack = process.env.E2E_STACK === "1";

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: { baseURL: external ?? `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    ...(stack ? [{ name: "stack", testDir: "./stack" }] : []),
    { name: "desktop", testDir: "./tests", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "phone", testDir: "./tests", use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } } },
  ],
  webServer: external ? undefined : {
    // Builds the app and runs it like production (`npm start`) on its own port and data.
    command: `rm -rf "${data}" && mkdir -p "${data}" && npm run build && npm start`,
    cwd: repo,
    url: `http://localhost:${PORT}/api/health`,
    timeout: 240_000,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      PORT: String(PORT),
      DATABASE_URL: `file:${path.join(data, "e2e.db")}`,
      UPLOAD_DIR: path.join(data, "uploads"),
      MEDIA_SECRET: "e2e-secret",
      LOG: "0",
    },
  },
});

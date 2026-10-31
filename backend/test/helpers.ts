import { randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig, type Config } from "../src/config";
import { migrate } from "../src/migrate";
import type { Store } from "../src/store/types";

/**
 * API tests run twice: with the memory store (`vitest run`) and with SQLite
 * (`TEST_STORE=prisma vitest run`), see package.json. Each Prisma test gets its
 * own copy of a database that was migrated once.
 *
 * `TEST_DATABASE=postgres` (with `TEST_STORE=prisma`, `npm run test:postgres`) runs the same tests
 * against Postgres at `TEST_POSTGRES_URL` (#71). Each test gets its own migrated schema there.
 */
export const TEST_STORE: Config["store"] = process.env.TEST_STORE === "prisma" ? "prisma" : "memory";
export const TEST_DATABASE: "sqlite" | "postgres" = process.env.TEST_DATABASE === "postgres" ? "postgres" : "sqlite";
export const TEST_POSTGRES_URL = process.env.TEST_POSTGRES_URL ?? "postgresql://moveeasy:moveeasy@localhost:5432/moveeasy";

let template: string | null = null;
function migratedTemplate(): string {
  if (template && existsSync(template)) return template;
  const file = path.join(os.tmpdir(), `moveeasy-template-${process.pid}.db`);
  migrate(`file:${file}`);
  return (template = file);
}

/** A Postgres URL with its own, newly migrated schema. */
export function freshPostgresUrl(base = TEST_POSTGRES_URL): string {
  const url = new URL(base);
  url.searchParams.set("schema", `t_${process.pid}_${randomUUID().slice(0, 8)}`);
  migrate(url.toString());
  return url.toString();
}

/** A fresh, migrated database for one test: a SQLite file, or a Postgres schema with `TEST_DATABASE=postgres`. */
export function freshDatabaseUrl(): string {
  if (TEST_DATABASE === "postgres") return freshPostgresUrl();
  const dir = mkdtempSync(path.join(os.tmpdir(), "moveeasy-db-"));
  const file = path.join(dir, "test.db");
  copyFileSync(migratedTemplate(), file);
  return `file:${file}`;
}

/** Config for tests: a fresh upload folder and database, no request log. */
export function testConfig(overrides: Partial<Config> = {}): Config {
  const store = overrides.store ?? TEST_STORE;
  return {
    ...loadConfig({ NODE_ENV: "test" }),
    store,
    migrate: false,
    databaseUrl: store === "prisma" ? freshDatabaseUrl() : "file:unused",
    uploadDir: mkdtempSync(path.join(os.tmpdir(), "moveeasy-")),
    log: false,
    ...overrides,
  };
}

/** Stores opened by tests; `setup.ts` closes them after each test. */
export const openStores: Store[] = [];

/** A fresh app with the seeded store and a clock the test can move. */
export async function testApp(opts: { now?: Date; config?: Partial<Config> } = {}) {
  const { buildDeps, createApp } = await import("../src/app");
  const clock = { now: opts.now ?? new Date("2026-10-19T10:00:00Z") };
  const deps = await buildDeps(testConfig(opts.config), () => clock.now);
  openStores.push(deps.store);
  // Every response goes through the contract check (#32).
  const { default: express } = await import("express");
  const { contractCheck } = await import("./contract");
  const app = express().use(contractCheck).use(createApp(deps));
  return { app, deps, clock, advance: (ms: number) => (clock.now = new Date(clock.now.getTime() + ms)) };
}

/** Logs in a seed user and returns the Authorization header. */
export async function loginHeader(app: import("express").Express, email = "aigerim@example.com") {
  const { default: request } = await import("supertest");
  const res = await request(app).post("/api/auth/login").send({ email, password: "password123" });
  if (res.status !== 200) throw new Error(`login failed: ${res.status}`);
  return { Authorization: `Bearer ${res.body.token}` };
}

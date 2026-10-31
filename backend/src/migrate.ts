import { spawnSync } from "node:child_process";
import { isPostgresUrl, loadConfig } from "./config";

/** The Prisma schema for a database URL, relative to `backend/`. */
export const schemaFor = (url: string) => (isPostgresUrl(url) ? "prisma/postgres/schema.prisma" : "prisma/schema.prisma");

/** Applies Prisma migrations to the database the server uses (from env, or the default in config.ts). */
export function migrate(databaseUrl = loadConfig().databaseUrl) {
  const r = spawnSync("npx", ["prisma", "migrate", "deploy", "--schema", schemaFor(databaseUrl)], {
    cwd: new URL("..", import.meta.url).pathname,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: process.env.VITEST ? "pipe" : "inherit",
  });
  if (r.status !== 0) throw new Error(`prisma migrate deploy failed: ${r.stderr?.toString() ?? ""}`);
}

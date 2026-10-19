import { spawnSync } from "node:child_process";
import { loadConfig } from "./config";

/**
 * `npm run db:migrate` (and `npm run db:seed` from #34). Runs Prisma with the same
 * DATABASE_URL the server uses (from env, or the default in config.ts).
 */
export function migrate(databaseUrl = loadConfig().databaseUrl) {
  const r = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: new URL("..", import.meta.url).pathname,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: process.env.VITEST ? "pipe" : "inherit",
  });
  if (r.status !== 0) throw new Error(`prisma migrate deploy failed: ${r.stderr?.toString() ?? ""}`);
}

const command = process.argv[2];
if (command === "migrate") {
  migrate();
} else if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("usage: tsx src/db-cli.ts migrate|seed");
  process.exit(1);
}

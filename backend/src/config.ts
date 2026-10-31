import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "../..");

/** `postgres://` and `postgresql://` URLs use Postgres; anything else (`file:...`) uses SQLite (#71). */
export const isPostgresUrl = (url: string) => /^postgres(ql)?:\/\//.test(url);

export interface Config {
  port: number;
  /** Where media files are kept. Created on start. */
  uploadDir: string;
  /** HMAC key for signed media URLs. */
  mediaSecret: string;
  /** `prisma` (SQLite or Postgres through Prisma, the default) or `memory` (data lost on restart). */
  store: "memory" | "prisma";
  databaseUrl: string;
  /** Load the demo data into an empty store on start. */
  seed: boolean;
  /** Apply Prisma migrations on start (tests copy an already migrated database instead). */
  migrate: boolean;
  /** Built frontend to serve from the same origin (`npm start`, #38). */
  staticDir: string | null;
  log: boolean;
  /** Express `trust proxy`: which proxies may set X-Forwarded-For. `loopback` unless TRUST_PROXY says otherwise (#72). */
  trustProxy: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // Prisma unless STORE=memory (iteration 4). DATABASE_URL picks SQLite (`file:`) or Postgres (#71).
  const store = env.STORE === "memory" ? "memory" : "prisma";
  return {
    port: Number(env.PORT ?? 8787),
    uploadDir: path.resolve(env.UPLOAD_DIR ?? path.join(REPO_ROOT, "backend/data/uploads")),
    mediaSecret: env.MEDIA_SECRET ?? "dev-only-secret-change-me",
    store,
    databaseUrl: env.DATABASE_URL ?? `file:${path.join(REPO_ROOT, "backend/data/moveeasy.db")}`,
    seed: env.SEED !== "0",
    migrate: env.MIGRATE !== "0",
    // Relative paths are taken from the repository root, so `STATIC_DIR=frontend/dist` works from any workspace.
    staticDir: env.STATIC_DIR ? path.resolve(REPO_ROOT, env.STATIC_DIR) : null,
    log: env.NODE_ENV !== "test" && env.LOG !== "0",
    // Behind Caddy in Docker the proxy has a private address: TRUST_PROXY="loopback, uniquelocal".
    trustProxy: env.TRUST_PROXY ?? "loopback",
  };
}

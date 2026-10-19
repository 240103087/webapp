import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "../..");

export interface Config {
  port: number;
  /** Where media files are kept. Created on start. */
  uploadDir: string;
  /** HMAC key for signed media URLs. */
  mediaSecret: string;
  /** `prisma` (SQLite through Prisma, the default) or `memory` (data lost on restart). */
  store: "memory" | "prisma";
  databaseUrl: string;
  /** Load the demo data into an empty store on start. */
  seed: boolean;
  /** Apply Prisma migrations on start (tests copy an already migrated database instead). */
  migrate: boolean;
  /** Built frontend to serve from the same origin (`npm start`, #38). */
  staticDir: string | null;
  log: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // SQLite through Prisma unless STORE=memory (iteration 4).
  const store = env.STORE === "memory" ? "memory" : "prisma";
  return {
    port: Number(env.PORT ?? 8787),
    uploadDir: path.resolve(env.UPLOAD_DIR ?? path.join(REPO_ROOT, "backend/data/uploads")),
    mediaSecret: env.MEDIA_SECRET ?? "dev-only-secret-change-me",
    store,
    databaseUrl: env.DATABASE_URL ?? `file:${path.join(REPO_ROOT, "backend/data/moveeasy.db")}`,
    seed: env.SEED !== "0",
    migrate: env.MIGRATE !== "0",
    staticDir: env.STATIC_DIR ? path.resolve(env.STATIC_DIR) : null,
    log: env.NODE_ENV !== "test" && env.LOG !== "0",
  };
}

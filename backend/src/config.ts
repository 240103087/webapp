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
  /** `memory` (data lost on restart) or `prisma` (SQLite through Prisma, #34). */
  store: "memory" | "prisma";
  databaseUrl: string;
  /** Load the demo data into an empty store on start. */
  seed: boolean;
  /** Built frontend to serve from the same origin (`npm start`, #38). */
  staticDir: string | null;
  log: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const store = env.STORE === "memory" ? "memory" : env.STORE === "prisma" ? "prisma" : "memory";
  return {
    port: Number(env.PORT ?? 8787),
    uploadDir: path.resolve(env.UPLOAD_DIR ?? path.join(REPO_ROOT, "backend/data/uploads")),
    mediaSecret: env.MEDIA_SECRET ?? "dev-only-secret-change-me",
    store,
    databaseUrl: env.DATABASE_URL ?? `file:${path.join(REPO_ROOT, "backend/data/moveeasy.db")}`,
    seed: env.SEED !== "0",
    staticDir: env.STATIC_DIR ? path.resolve(env.STATIC_DIR) : null,
    log: env.NODE_ENV !== "test" && env.LOG !== "0",
  };
}

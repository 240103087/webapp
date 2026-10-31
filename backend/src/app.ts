import fs from "node:fs";
import path from "node:path";
import express, { type Express } from "express";
import { loadConfig, type Config } from "./config";
import { apiNotFound, errorHandler } from "./errors";
import { FileStore, UrlSigner } from "./files";
import { authRoutes } from "./routes/auth";
import { mediaRoutes } from "./routes/media";
import { moveRoutes } from "./routes/moves";
import { publicRoutes } from "./routes/public";
import { replyRoutes } from "./routes/replies";
import { statsRoutes } from "./routes/stats";
import { tagRoutes } from "./routes/tags";
import { MemoryStore } from "./store/memory";
import { seedStore } from "./store/seed";
import type { Store } from "./store/types";

export interface AppDeps {
  config: Config;
  /** The clock, replaceable in tests. */
  now: () => Date;
  store: Store;
  files: FileStore;
  signer: UrlSigner;
}

/** Builds the store named in the config and seeds it with the demo data when it is empty. */
export async function buildDeps(config: Config = loadConfig(), now: () => Date = () => new Date()): Promise<AppDeps> {
  const store: Store = await openStore(config);
  const files = new FileStore(config.uploadDir);
  if (config.seed && (await store.isEmpty())) await seedStore(store, files, now());
  return { config, now, store, files, signer: new UrlSigner(config.mediaSecret) };
}

async function openStore(config: Config): Promise<Store> {
  if (config.store === "memory") return new MemoryStore();
  if (config.migrate) {
    const { migrate } = await import("./migrate");
    migrate(config.databaseUrl);
  }
  const { PrismaStore } = await import("./store/prisma-store");
  return PrismaStore.open(config.databaseUrl);
}

export function createApp(deps: AppDeps): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", deps.config.trustProxy);
  if (deps.config.log) {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`));
      next();
    });
  }
  app.use(express.json({ limit: "200kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api", authRoutes(deps));
  app.use("/api", tagRoutes(deps));
  app.use("/api", mediaRoutes(deps));
  app.use("/api", publicRoutes(deps));
  app.use("/api", replyRoutes(deps));
  app.use("/api", moveRoutes(deps));
  app.use("/api", statsRoutes(deps));

  app.use("/api", apiNotFound);
  if (deps.config.staticDir) serveFrontend(app, deps.config.staticDir);
  app.use(errorHandler);
  return app;
}

/**
 * `npm start` (#38): the built frontend and the API on one port. Hashed assets are cached for a year;
 * every other GET outside /api gets index.html so client routes like /t/<code> open directly.
 */
function serveFrontend(app: Express, dir: string) {
  const index = path.join(dir, "index.html");
  if (!fs.existsSync(index)) throw new Error(`STATIC_DIR has no index.html: ${dir}. Run npm run build first.`);
  app.use("/assets", express.static(path.join(dir, "assets"), { immutable: true, maxAge: "1y" }));
  app.use("/assets", (_req, res) => {
    res.status(404).end();
  });
  app.use(express.static(dir, { index: false, maxAge: "1h" }));
  app.get("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(index);
  });
}

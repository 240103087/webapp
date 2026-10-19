import express, { type Express } from "express";
import { loadConfig, type Config } from "./config";
import { apiNotFound, errorHandler } from "./errors";
import { FileStore, UrlSigner } from "./files";
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
  if (config.store === "prisma") throw new Error("STORE=prisma arrives in #34");
  return new MemoryStore();
}

export function createApp(deps: AppDeps): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", "loopback");
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

  app.use("/api", apiNotFound);
  app.use(errorHandler);
  return app;
}

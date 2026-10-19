import express, { type Express } from "express";
import { loadConfig, type Config } from "./config";
import { apiNotFound, errorHandler } from "./errors";

export interface AppDeps {
  config: Config;
  /** The clock, replaceable in tests. */
  now: () => Date;
}

export function defaultDeps(overrides: Partial<AppDeps> = {}): AppDeps {
  return { config: loadConfig(), now: () => new Date(), ...overrides };
}

export function createApp(deps: AppDeps = defaultDeps()): Express {
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

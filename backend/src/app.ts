import fs from "node:fs";
import path from "node:path";
import { context, type Meter } from "@opentelemetry/api";
import express, { type ErrorRequestHandler, type Express, type Request } from "express";
import { loadConfig, type Config } from "./config";
import { apiNotFound, errorHandler, isUnexpected } from "./errors";
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
import { emitLog } from "./telemetry/log";
import { appMetrics, type AppMetrics } from "./telemetry/metrics";

export interface AppDeps {
  config: Config;
  /** The clock, replaceable in tests. */
  now: () => Date;
  store: Store;
  files: FileStore;
  signer: UrlSigner;
  /** MoveEasy's metrics (#104). */
  metrics: AppMetrics;
}

/** Builds the store named in the config and seeds it with the demo data when it is empty. */
export async function buildDeps(config: Config = loadConfig(), now: () => Date = () => new Date(), meter?: Meter): Promise<AppDeps> {
  const store: Store = await openStore(config);
  const files = new FileStore(config.uploadDir);
  if (config.seed && (await store.isEmpty())) await seedStore(store, files, now());
  const metrics = appMetrics({ environment: config.appEnv, version: config.appVersion }, meter);
  return { config, now, store, files, signer: new UrlSigner(config.mediaSecret), metrics };
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
  app.use("/api", (req, res, next) => {
    // In-flight gauge, request time and the request log, as a console line and an OpenTelemetry log record in the request's trace (#103).
    const start = Date.now();
    const ctx = context.active();
    deps.metrics.requestStarted();
    res.once("close", () => {
      const ms = Date.now() - start;
      deps.metrics.requestEnded(operationOf(req), res.statusCode, ms / 1000);
      if (!deps.config.log || req.path === "/health") return;
      const line = `${req.method} ${req.originalUrl.split("?")[0]} ${res.statusCode} ${ms}ms`;
      console.log(line);
      emitLog(res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info", line, {
        "http.request.method": req.method, "url.path": req.originalUrl.split("?")[0], "http.route": operationOf(req), "http.response.status_code": res.statusCode, "duration_ms": ms,
      }, ctx);
    });
    next();
  });
  app.use(express.json({ limit: "200kb" }));

  app.get("/api/health", (_req, res) => {
    // Which build runs where (#101): the promotion workflow waits for prod to report the promoted version.
    res.json({ ok: true, environment: deps.config.appEnv, version: deps.config.appVersion });
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
  app.use(countFailures(deps));
  app.use(errorHandler);
  deps.metrics.initialize(apiOperations(app));
  return app;
}

type Layer = { route?: { path: string; methods: Record<string, boolean> }; handle?: { stack?: Layer[] } };

/** Every API route template, like `POST /api/tags`, from the routers mounted on /api. */
export function apiOperations(app: Express): string[] {
  const ops = new Set<string>();
  const walk = (stack: Layer[], prefix: string) => {
    for (const layer of stack) {
      if (layer.route) for (const m of Object.keys(layer.route.methods)) ops.add(`${m.toUpperCase()} ${layer.route.path.startsWith("/api/") ? "" : prefix}${layer.route.path}`);
      else if (layer.handle?.stack) walk(layer.handle.stack, "/api");
    }
  };
  walk((app as unknown as { _router: { stack: Layer[] } })._router.stack, "");
  return [...ops].filter((o) => o.includes(" /api/"));
}

/** The route template of a request, like `POST /api/tags/:tagId/media`, so metrics do not get one series per id. */
export function operationOf(req: Request): string {
  const route = (req as Request & { route?: { path?: string } }).route?.path;
  if (!route) return `${req.method} unmatched`;
  return `${req.method} ${route.startsWith("/api/") ? route : `/api${route}`}`;
}

/** Unexpected errors (the ones that become a 500) count as a failure of their operation (#104); the alert watches this (#105). */
function countFailures(deps: AppDeps): ErrorRequestHandler {
  return (err, req, _res, next) => {
    if (isUnexpected(err)) {
      const operation = operationOf(req);
      deps.metrics.failed(operation);
      emitLog("error", `${operation} failed: ${err instanceof Error ? err.message : String(err)}`, {
        "http.route": operation,
        "exception.type": err instanceof Error ? err.name : typeof err,
        "exception.message": err instanceof Error ? err.message : String(err),
        "exception.stacktrace": err instanceof Error ? (err.stack ?? "") : "",
      });
    }
    next(err);
  };
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

/**
 * OpenTelemetry for the backend (#103). Loaded before the app with `node --import tsx --import ./src/telemetry/instrumentation.ts`,
 * so the HTTP, Express and Prisma instrumentations are in place before those modules load.
 *
 * Nothing happens unless OTEL_EXPORTER_OTLP_ENDPOINT is set (tests, `npm run dev`). The standard OTel variables apply:
 * OTEL_EXPORTER_OTLP_ENDPOINT (the collector or Grafana Cloud's OTLP gateway), OTEL_EXPORTER_OTLP_HEADERS (its auth),
 * OTEL_METRIC_EXPORT_INTERVAL (ms, default 60000), OTEL_SDK_DISABLED=true to switch it off.
 */
import { register } from "node:module";

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
if (endpoint && process.env.OTEL_SDK_DISABLED !== "true") {
  // ESM hooks so `import express` is instrumented too (import-in-the-middle).
  register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);
  const { startTelemetry } = await import("./sdk");
  await startTelemetry();
}

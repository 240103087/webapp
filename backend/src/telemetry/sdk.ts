import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import { loadConfig } from "../config";

/** Paths that would only add noise: the health check (polled by Render and Docker) and static files. */
const ignored = (url = "") => url.startsWith("/api/health") || url.startsWith("/assets/") || !url.startsWith("/api/");

/** Starts the Node SDK: traces, metrics and logs over OTLP (http/protobuf), with the service, version and environment. */
export async function startTelemetry(): Promise<NodeSDK> {
  const { appEnv, appVersion } = loadConfig();
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "moveeasy",
      [ATTR_SERVICE_VERSION]: appVersion,
      "deployment.environment.name": appEnv,
    }),
    traceExporter: new OTLPTraceExporter(),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
      exportIntervalMillis: Number(process.env.OTEL_METRIC_EXPORT_INTERVAL || 60_000),
    }),
    logRecordProcessors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
    instrumentations: [
      new HttpInstrumentation({ ignoreIncomingRequestHook: (req) => ignored(req.url) }),
      new ExpressInstrumentation(),
      new PrismaInstrumentation(),
    ],
  });
  sdk.start();
  const stop = () => {
    sdk.shutdown().catch(() => {}).finally(() => process.exit(0));
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  console.log(`OpenTelemetry on: sending traces, metrics and logs to ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT} (env ${appEnv}, version ${appVersion})`);
  return sdk;
}

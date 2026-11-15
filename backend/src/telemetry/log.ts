import { context, type Context } from "@opentelemetry/api";
import { logs, SeverityNumber, type AnyValueMap } from "@opentelemetry/api-logs";

const SEVERITY = { info: SeverityNumber.INFO, warn: SeverityNumber.WARN, error: SeverityNumber.ERROR } as const;

/**
 * An OpenTelemetry log record (#103), linked to the trace of `ctx` (the request) when one is active.
 * The console line is written by the caller, so the terminal output stays as it was. A no-op without the SDK.
 */
export function emitLog(level: keyof typeof SEVERITY, body: string, attributes: AnyValueMap = {}, ctx: Context = context.active()) {
  logs.getLogger("moveeasy").emit({ severityNumber: SEVERITY[level], severityText: level.toUpperCase(), body, attributes, context: ctx });
}

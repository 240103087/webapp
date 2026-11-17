#!/usr/bin/env node
// The on-call agent's prompt (#106): prompt.md, then the alert. Used by on-call.mjs (local) and
// .github/workflows/on-call.yml (hosted).  node on-call-engineer/build-prompt.mjs alert.json > prompt.txt
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** Drops what only adds noise for the agent (Grafana's internal annotations, silence links). */
function trim(alert) {
  const { silenceURL, imageURL, ...rest } = alert;
  const annotations = Object.fromEntries(Object.entries(alert.annotations ?? {}).filter(([k]) => !k.startsWith("__")));
  return { ...rest, annotations };
}

/** `alert` is Grafana's webhook body (status, commonLabels, alerts[]), a list of alerts from its API, or plain text. */
export function buildPrompt(alert) {
  let shown = alert;
  if (Array.isArray(alert)) shown = alert.map(trim);
  else if (alert && typeof alert === "object" && Array.isArray(alert.alerts)) shown = { ...alert, alerts: alert.alerts.map(trim) };
  const text = typeof shown === "string" ? shown : JSON.stringify(shown, null, 2);
  return `${readFileSync(join(here, "prompt.md"), "utf8")}\n\n## The alert\n\n\`\`\`json\n${text}\n\`\`\`\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raw = readFileSync(process.argv[2] ?? 0, "utf8");
  let alert;
  try {
    alert = JSON.parse(raw);
  } catch {
    alert = raw.trim();
  }
  process.stdout.write(buildPrompt(alert));
}

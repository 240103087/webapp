#!/usr/bin/env node
// Puts the MoveEasy dashboard, alert rules, on-call contact point and notification policy into a Grafana through
// its HTTP API (#104, #105, #106). Made for Grafana Cloud, where the local file provisioning does not apply; the
// "Set up Grafana" workflow (.github/workflows/grafana.yml) runs it with the repository secrets. Safe to run again.
//
//   GRAFANA_URL=https://<stack>.grafana.net GRAFANA_TOKEN=glsa_... ONCALL_GITHUB_TOKEN=github_pat_... \
//     node observability/grafana/provision.mjs
//
// GRAFANA_TOKEN: a service account token with the Admin role (Administration > Users and access > Service accounts).
// ONCALL_GITHUB_TOKEN: a fine-grained GitHub token for this repository with Contents, Issues and Pull requests
// "read and write". Grafana sends it to GitHub's repository_dispatch API, which starts the on-call agent
// (.github/workflows/on-call.yml); the agent's workflow uses it too, so its pull request runs CI.
// Optional: GITHUB_REPOSITORY (default 240103087/webapp), PROMETHEUS_UID and LOKI_UID (found automatically).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const base = (process.env.GRAFANA_URL ?? "").replace(/\/+$/, "");
const token = process.env.GRAFANA_TOKEN ?? "";
const repo = process.env.GITHUB_REPOSITORY || "240103087/webapp";
const githubToken = process.env.ONCALL_GITHUB_TOKEN ?? "";
if (!base || !token) {
  console.error("Set GRAFANA_URL and GRAFANA_TOKEN (a service account token, or user:password for a local Grafana)");
  process.exit(1);
}

const FOLDER = { uid: "moveeasy-alerts", title: "MoveEasy" }; // not "moveeasy": Grafana 12 refuses a dashboard with its folder's uid
const GROUP = "moveeasy";
const CONTACT = { uid: "moveeasy-on-call", name: "MoveEasy on-call agent" };
// GitHub's repository_dispatch body: { event_type, client_payload }. Grafana's custom webhook payload builds it (Grafana 12+).
const DISPATCH_PAYLOAD =
  '{{ coll.Dict "event_type" "grafana-alert" "client_payload" (coll.Dict "status" .Status "groupLabels" .GroupLabels ' +
  '"commonLabels" .CommonLabels "commonAnnotations" .CommonAnnotations "externalURL" .ExternalURL "alerts" .Alerts) | data.ToJSON }}';

const auth = token.includes(":") && !token.startsWith("glsa_") ? `Basic ${Buffer.from(token).toString("base64")}` : `Bearer ${token}`;

async function api(method, path, body, okStatuses = []) {
  const res = await fetch(base + path, {
    method,
    headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json", "X-Disable-Provenance": "true" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok && !okStatuses.includes(res.status)) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 500)}`);
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

/** The data source of a type: the given uid, else Grafana Cloud's own one (grafanacloud-<stack>-prom / -logs), else the first. */
async function datasourceUid(type, wanted) {
  if (wanted) return wanted;
  const all = (await api("GET", "/api/datasources")).json.filter((d) => d.type === type);
  const cloud = all.find((d) => /^grafanacloud-.*-(prom|logs)$/.test(d.name));
  const ds = cloud ?? all.find((d) => d.isDefault) ?? all[0];
  if (!ds) throw new Error(`No ${type} data source in this Grafana`);
  return ds.uid;
}

const prometheus = await datasourceUid("prometheus", process.env.PROMETHEUS_UID);
const loki = await datasourceUid("loki", process.env.LOKI_UID);
console.log(`Grafana ${base}: Prometheus ${prometheus}, Loki ${loki}`);

// 1. Folder
await api("POST", "/api/folders", FOLDER, [409, 412]);
console.log(`Folder ${FOLDER.title}`);

// 2. Dashboard, with its data source variables defaulting to this Grafana's data sources
const dashboard = JSON.parse(readFileSync(join(here, "dashboards/moveeasy.json"), "utf8"));
for (const v of dashboard.templating.list) {
  if (v.name === "datasource") v.current = { text: prometheus, value: prometheus };
  if (v.name === "logs") v.current = { text: loki, value: loki };
}
const saved = await api("POST", "/api/dashboards/db", { dashboard: { ...dashboard, id: null }, folderUid: FOLDER.uid, overwrite: true, message: "provision.mjs" });
console.log(`Dashboard ${base}${saved.json.url}`);

// 3. Alert rules, from the same file the local Grafana loads
const { groups } = parse(readFileSync(join(here, "provisioning/alerting/rules.yaml"), "utf8"));
const group = groups.find((g) => g.name === GROUP);
const rules = group.rules.map((r) => ({
  ...r,
  folderUID: FOLDER.uid,
  ruleGroup: GROUP,
  orgID: 1,
  data: r.data.map((d) => ({ ...d, datasourceUid: d.datasourceUid === "prometheus" ? prometheus : d.datasourceUid })),
}));
await api("PUT", `/api/v1/provisioning/folder/${FOLDER.uid}/rule-groups/${GROUP}`, { title: GROUP, interval: 60, rules });
console.log(`Alert rules: ${rules.map((r) => r.title).join(", ")}`);

// 4. Contact point: GitHub repository_dispatch, which starts the on-call agent
if (!githubToken) {
  console.log("ONCALL_GITHUB_TOKEN is not set: the contact point and notification policy are left as they are");
  process.exit(0);
}
const contact = {
  uid: CONTACT.uid,
  name: CONTACT.name,
  type: "webhook",
  disableResolveMessage: false,
  settings: {
    url: `https://api.github.com/repos/${repo}/dispatches`,
    httpMethod: "POST",
    authorization_scheme: "Bearer",
    authorization_credentials: githubToken,
    maxAlerts: 10,
    payload: { template: DISPATCH_PAYLOAD },
  },
};
const existing = (await api("GET", "/api/v1/provisioning/contact-points")).json.find((c) => c.uid === CONTACT.uid);
if (existing) await api("PUT", `/api/v1/provisioning/contact-points/${CONTACT.uid}`, contact);
else await api("POST", "/api/v1/provisioning/contact-points", contact);
console.log(`Contact point "${CONTACT.name}" -> repository_dispatch on ${repo}`);

// 5. Notification policy: MoveEasy alerts go to the agent, one notification per alert, environment and operation
const tree = (await api("GET", "/api/v1/provisioning/policies")).json;
const route = {
  receiver: CONTACT.name,
  object_matchers: [["service", "=", "moveeasy"]],
  group_by: ["alertname", "environment", "operation"],
  group_wait: "30s",
  group_interval: "5m",
  repeat_interval: "12h",
};
tree.routes = [route, ...(tree.routes ?? []).filter((r) => r.receiver !== CONTACT.name)];
await api("PUT", "/api/v1/provisioning/policies", tree);
console.log("Notification policy: service=moveeasy -> on-call agent");

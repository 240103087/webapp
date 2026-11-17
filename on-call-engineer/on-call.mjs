#!/usr/bin/env node
// Local on-call engineer (#106), as in the article: polls Grafana's alert API every minute and hands each new
// firing MoveEasy alert to a headless coding agent (Claude Code), one at a time. Each run is saved under
// on-call-engineer/sessions/<time>-<alert>/: alert.json, prompt.txt, session.jsonl (the agent's whole session),
// report.md (its verdict) and fix.diff (what it changed in the working tree; nothing is committed).
//
//   node on-call-engineer/on-call.mjs            # poll every POLL_SECONDS (60)
//   node on-call-engineer/on-call.mjs --once     # one poll, then exit
//
// GRAFANA_URL (http://localhost:3000), GRAFANA_TOKEN (admin:admin, or a service account token),
// AGENT (claude), AGENT_ARGS (extra arguments). Claude Code must be logged in (`claude` once) or have
// ANTHROPIC_API_KEY. The hosted version is .github/workflows/on-call.yml.
import { spawn, execFileSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPrompt } from "./build-prompt.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const sessions = join(here, "sessions");
const seenFile = join(sessions, "seen.json");
const base = (process.env.GRAFANA_URL || "http://localhost:3000").replace(/\/+$/, "");
const token = process.env.GRAFANA_TOKEN || "admin:admin";
const auth = token.includes(":") && !token.startsWith("glsa_") ? `Basic ${Buffer.from(token).toString("base64")}` : `Bearer ${token}`;
const agent = process.env.AGENT || "claude";
const pollMs = Number(process.env.POLL_SECONDS || 60) * 1000;

mkdirSync(sessions, { recursive: true });
const seen = new Set(existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, "utf8")) : []);
const log = (msg) => console.log(`${new Date().toISOString()} ${msg}`);

/** Firing MoveEasy alerts from Grafana's built-in Alertmanager. */
async function firingAlerts() {
  const res = await fetch(`${base}/api/alertmanager/grafana/api/v2/alerts?active=true&silenced=false&inhibited=false`, { headers: { Authorization: auth } });
  if (!res.ok) throw new Error(`Grafana alert API: ${res.status} ${await res.text()}`);
  return (await res.json()).filter((a) => a.labels?.service === "moveeasy" && a.status?.state === "active");
}

/** Runs the agent on one alert and waits for it to finish. */
function respond(alert) {
  const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${(alert.labels.alertname ?? "alert").replace(/\W+/g, "-")}`;
  const dir = join(sessions, name);
  mkdirSync(dir, { recursive: true });
  const prompt = buildPrompt([alert]);
  writeFileSync(join(dir, "alert.json"), JSON.stringify(alert, null, 2));
  writeFileSync(join(dir, "prompt.txt"), prompt);
  const report = join(dir, "report.md");
  const args = [
    "-p", prompt,
    "--output-format", "stream-json", "--verbose",
    "--permission-mode", "acceptEdits",
    "--allowedTools", "Bash", "Read", "Edit", "Write", "Grep", "Glob",
    ...(process.env.AGENT_ARGS ? process.env.AGENT_ARGS.split(" ") : []),
  ];
  log(`${alert.labels.alertname} ${JSON.stringify(alert.labels)}: starting ${agent}, session in ${relative(repo, dir)}`);
  const out = createWriteStream(join(dir, "session.jsonl"));
  return new Promise((resolve) => {
    const child = spawn(agent, args, { cwd: repo, env: { ...process.env, ONCALL_REPORT: report }, stdio: ["ignore", "pipe", "inherit"] });
    child.stdout.pipe(out);
    child.on("error", (err) => {
      log(`could not start ${agent}: ${err.message}`);
      resolve();
    });
    child.on("close", (code) => {
      const diff = execFileSync("git", ["diff"], { cwd: repo, encoding: "utf8" });
      writeFileSync(join(dir, "fix.diff"), diff);
      const verdict = existsSync(report) ? readFileSync(report, "utf8").split("\n")[0] : "no report";
      log(`${alert.labels.alertname}: agent exited with ${code}, ${verdict}, ${diff ? "changes in the working tree (fix.diff)" : "no changes"}`);
      resolve();
    });
  });
}

async function poll() {
  const alerts = await firingAlerts();
  for (const a of alerts) {
    const key = `${a.fingerprint}@${a.startsAt}`; // a new firing of the same alert is a new incident
    if (seen.has(key)) continue;
    seen.add(key);
    writeFileSync(seenFile, JSON.stringify([...seen], null, 2));
    await respond(a);
  }
  return alerts.length;
}

log(`watching ${base} for MoveEasy alerts every ${pollMs / 1000}s`);
do {
  try {
    const n = await poll();
    if (process.argv.includes("--once")) log(`${n} firing`);
  } catch (err) {
    log(String(err.message ?? err));
  }
  if (process.argv.includes("--once")) break;
  await new Promise((r) => setTimeout(r, pollMs));
} while (true);

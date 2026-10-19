import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type { RequestHandler } from "express";
import { parse } from "yaml";

/**
 * Checks every JSON response the app sends in tests against `openapi.yaml` (#32).
 * Violations are collected and fail the test that caused them (see `setup.ts`).
 */
const doc = parse(readFileSync(fileURLToPath(new URL("../../openapi.yaml", import.meta.url)), "utf8"));

// OpenAPI 3.0 extras Ajv does not need: `discriminator` (the oneOf branches are exclusive anyway) and `example`.
function clean(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(clean);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) if (k !== "discriminator" && k !== "example") out[k] = clean(v);
  return out;
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv as never); // two Ajv copies in node_modules; the runtime API is the same
ajv.addSchema({ $id: "openapi", components: clean(doc.components) });
const fixRefs = (node: unknown): unknown => JSON.parse(JSON.stringify(clean(node)).replaceAll('"#/components/', '"openapi#/components/'));

interface Operation { id: string; method: string; regex: RegExp; template: string; responses: Record<string, { content?: Record<string, { schema?: unknown }> }> }
export const operations: Operation[] = [];
for (const [template, item] of Object.entries(doc.paths as Record<string, Record<string, Operation["responses"] & { operationId: string; responses: Operation["responses"] }>>)) {
  for (const method of ["get", "post", "put", "patch", "delete"]) {
    const op = item[method] as unknown as { operationId: string; responses: Operation["responses"] } | undefined;
    if (!op) continue;
    const regex = new RegExp(`^${template.replace(/\{[^}]+\}/g, "[^/]+")}$`);
    operations.push({ id: op.operationId, method: method.toUpperCase(), regex, template, responses: op.responses });
  }
}
// Fixed paths win over templated ones (`/media/order` before `/media/{mediaId}`).
operations.sort((a, b) => (a.template.match(/\{/g)?.length ?? 0) - (b.template.match(/\{/g)?.length ?? 0));

function resolveResponse(r: { $ref?: string; content?: Record<string, { schema?: unknown }> }) {
  if (r.$ref) return doc.components.responses[r.$ref.split("/").pop()!];
  return r;
}

const cache = new Map<string, ValidateFunction | null>();
function validatorFor(op: Operation, status: number): ValidateFunction | null | "undocumented" {
  const key = `${op.id} ${status}`;
  if (cache.has(key)) return cache.get(key)!;
  const raw = op.responses[String(status)];
  if (!raw) return "undocumented";
  const schema = resolveResponse(raw).content?.["application/json"]?.schema;
  const v = schema ? ajv.compile(fixRefs(schema) as object) : null;
  cache.set(key, v);
  return v;
}

export const violations: string[] = [];
export const covered = new Set<string>();

export function findOperation(method: string, path: string) {
  return operations.find((o) => o.method === method && o.regex.test(path));
}

/** Express middleware: validates the status and JSON body of every response against the contract. */
export const contractCheck: RequestHandler = (req, res, next) => {
  const path = req.originalUrl.split("?")[0];
  if (!path.startsWith("/api/")) return next();
  const op = findOperation(req.method, path);
  const check = (body: unknown) => {
    if (!op) {
      // Unknown routes may only answer with the generic 404 or a 400 for a body that is not JSON.
      const code = (body as { code?: string })?.code;
      if (!((res.statusCode === 404 && code === "not_found") || (res.statusCode === 400 && code === "bad_json")))
        violations.push(`${req.method} ${path}: no operation in openapi.yaml`);
      return;
    }
    covered.add(op.id);
    const v = validatorFor(op, res.statusCode);
    if (v === "undocumented") violations.push(`${op.id}: status ${res.statusCode} is not documented (${JSON.stringify(body).slice(0, 120)})`);
    else if (v && !v(body)) violations.push(`${op.id} ${res.statusCode}: ${ajv.errorsText(v.errors)} in ${JSON.stringify(body).slice(0, 200)}`);
  };
  const json = res.json.bind(res);
  res.json = (body: unknown) => {
    check(body);
    return json(body);
  };
  const end = res.end.bind(res) as (...a: unknown[]) => typeof res;
  res.end = ((...args: unknown[]) => {
    // Bodies without res.json: 204s and files.
    if (op && !res.getHeader("content-type")?.toString().includes("application/json")) {
      covered.add(op.id);
      if (validatorFor(op, res.statusCode) === "undocumented") violations.push(`${op.id}: status ${res.statusCode} is not documented`);
    }
    return end(...args);
  }) as typeof res.end;
  next();
};

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import SwaggerParser from "@apidevtools/swagger-parser";
import { parse } from "yaml";
import { describe, it, expect } from "vitest";

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const doc = parse(readFileSync(root("openapi.yaml"), "utf8"));
const METHODS = ["get", "put", "post", "patch", "delete"] as const;

type Op = { operationId: string; security?: unknown[]; requestBody?: unknown; responses: Record<string, unknown>; "x-not-in-api"?: boolean };
const operations: Op[] = Object.values(doc.paths as Record<string, Record<string, Op>>).flatMap((item) =>
  METHODS.filter((m) => item[m]).map((m) => item[m]),
);

/** Method names of the `Api` interface in the frontend services layer. */
function apiMethods(): string[] {
  const src = readFileSync(root("frontend/src/api/types.ts"), "utf8");
  const body = src.slice(src.indexOf("export interface Api {"));
  const block = body.slice(0, body.indexOf("\n}\n"));
  return [...block.matchAll(/^\s{2}(\w+)\??\(/gm)].map((m) => m[1]);
}

describe("openapi.yaml (#22)", () => {
  it("is a valid OpenAPI 3.0 document", async () => {
    await expect(SwaggerParser.validate(root("openapi.yaml"))).resolves.toBeTruthy();
    expect(doc.openapi).toMatch(/^3\.0\./);
  });

  it("has exactly one operation per services-layer method", () => {
    const methods = apiMethods().filter((m) => m !== "resetDemo"); // mock only
    expect(methods.length).toBeGreaterThan(25);
    const ids = operations.filter((o) => !o["x-not-in-api"]).map((o) => o.operationId);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...methods].sort());
  });

  it("documents 401 for every call that needs a token and 422 for every call with a body", () => {
    for (const op of operations) {
      const needsToken = op.security?.length === 1 && JSON.stringify(op.security) === '[{"bearer":[]}]';
      if (needsToken) expect(op.responses, `${op.operationId} 401`).toHaveProperty("401");
      if (op.requestBody) expect(op.responses, `${op.operationId} 422`).toHaveProperty("422");
    }
  });

  it("has no keys made by an unquoted comma in a one-line description", () => {
    const bad: string[] = [];
    const walk = (o: unknown, path: string) => {
      if (!o || typeof o !== "object") return;
      for (const [k, v] of Object.entries(o)) {
        if (/\s|`/.test(k) && !k.startsWith("/")) bad.push(`${path}/${k}`);
        walk(v, `${path}/${k}`);
      }
    };
    walk(doc, "");
    expect(bad).toEqual([]);
  });
});

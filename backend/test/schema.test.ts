import { mkdtempSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";
import { migrate } from "../src/migrate";
import { freshPostgresUrl, TEST_DATABASE } from "./helpers";

const TABLES = ["Media", "Move", "PinFailure", "Reply", "Scan", "Session", "Tag", "Unlock", "User"];

describe("database schema (#33)", () => {
  it("migrations create every table on an empty SQLite file", async () => {
    const url = `file:${path.join(mkdtempSync(path.join(os.tmpdir(), "moveeasy-db-")), "t.db")}`;
    migrate(url);
    const db = new PrismaClient({ datasources: { db: { url } } });
    const rows = await db.$queryRawUnsafe<{ name: string }[]>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '\\_%' ESCAPE '\\' ORDER BY name");
    expect(rows.map((r) => r.name)).toEqual(TABLES);
    await db.$disconnect();
  });
});

describe("Postgres schema (#71)", () => {
  /** The models of a schema file, without comments, the generator and the datasource. */
  const models = (file: string) =>
    readFileSync(path.join(__dirname, "../prisma", file), "utf8")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/(generator|datasource) \w+ \{[^}]*\}/g, "")
      .replace(/\s+/g, " ")
      .trim();

  it("has the same models as the SQLite schema", () => {
    expect(models("postgres/schema.prisma")).toBe(models("schema.prisma"));
  });

  it.runIf(TEST_DATABASE === "postgres")("migrations create every table on an empty Postgres schema", async () => {
    const url = freshPostgresUrl();
    const schema = new URL(url).searchParams.get("schema");
    const { PrismaClient: Pg } = createRequire(import.meta.url)("../generated/postgres/index.js") as { PrismaClient: typeof PrismaClient };
    const pg = new Pg({ datasources: { db: { url } } });
    const rows = await pg.$queryRawUnsafe<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name NOT LIKE '\\_%' ORDER BY table_name`, schema,
    );
    expect(rows.map((r) => r.table_name)).toEqual(TABLES);
    await pg.$disconnect();
  });
});

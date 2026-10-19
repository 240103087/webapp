import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";
import { migrate } from "../src/migrate";

describe("database schema (#33)", () => {
  it("migrations create every table on an empty SQLite file", async () => {
    const url = `file:${path.join(mkdtempSync(path.join(os.tmpdir(), "moveeasy-db-")), "t.db")}`;
    migrate(url);
    const db = new PrismaClient({ datasources: { db: { url } } });
    const rows = await db.$queryRawUnsafe<{ name: string }[]>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '\\_%' ESCAPE '\\' ORDER BY name");
    expect(rows.map((r) => r.name)).toEqual(["Media", "Move", "PinFailure", "Reply", "Scan", "Session", "Tag", "Unlock", "User"]);
    await db.$disconnect();
  });
});

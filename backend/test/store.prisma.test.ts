import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PrismaStore } from "../src/store/prisma-store";
import { freshDatabaseUrl } from "./helpers";
import { storeSuite } from "./store.suite";

storeSuite("PrismaStore (SQLite)", async () => PrismaStore.open(freshDatabaseUrl()));

describe("PrismaStore specifics (#34)", () => {
  it("gives different box numbers to boxes created at the same time", async () => {
    const s = PrismaStore.open(freshDatabaseUrl());
    const at = "2026-10-19T10:00:00.000Z";
    await s.insertUser({ id: "u1", name: "U", email: "u@example.com", passwordHash: "h", createdAt: at });
    await s.insertMove({ id: "m1", ownerId: "u1", name: "M", fromAddress: null, toAddress: null, date: null, lastBoxNumber: 0, createdAt: at });
    const numbers = await Promise.all(Array.from({ length: 20 }, () => s.nextBoxNumber("m1")));
    expect(new Set(numbers).size).toBe(20);
    expect(Math.max(...numbers)).toBe(20);
    await s.close();
  });

  it("is the only source file that imports Prisma", () => {
    const src = path.join(__dirname, "../src");
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
    const importers = walk(src).filter((f) => /from "@prisma\/client"/.test(readFileSync(f, "utf8"))).map((f) => path.relative(src, f));
    expect(importers).toEqual(["store/prisma-store.ts"]);
  });
});

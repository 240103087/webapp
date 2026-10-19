import { existsSync, statSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { FileStore } from "../src/files";
import { checkSecret } from "../src/hash";
import { MemoryStore } from "../src/store/memory";
import { seedStore } from "../src/store/seed";
import { testConfig } from "./helpers";

describe("seed (#24)", () => {
  it("loads the same demo data as the mock and copies the demo files", async () => {
    const store = new MemoryStore();
    const files = new FileStore(testConfig().uploadDir);
    await seedStore(store, files, new Date("2026-10-19T10:00:00Z"));
    const aigerim = (await store.getUserByEmail("aigerim@example.com"))!;
    expect(aigerim.passwordHash).not.toBe("password123");
    expect(await checkSecret("password123", aigerim.passwordHash)).toBe(true);
    const tags = await store.listTags({ ownerId: aigerim.id });
    expect(tags).toHaveLength(17);
    expect(tags.filter((t) => t.status === "active")).toHaveLength(16);
    expect(await store.listTags({ moveId: "m_astana" })).toHaveLength(12);
    expect((await store.listTags({ ownerId: "u_dana" })).map((t) => t.code)).toEqual(["G5MK8WRT"]);
    const dombra = (await store.getTagByCode("D8RW5TQN"))!;
    expect(await checkSecret("1971", dombra.pinHash!)).toBe(true);
    const media = await store.listMedia(["t_keys"]);
    expect(media.map((m) => m.type)).toEqual(["photo", "photo", "audio", "video"]);
    for (const m of media) {
      expect(existsSync(files.abs(m.file))).toBe(true);
      expect(statSync(files.abs(m.file)).size).toBe(m.size);
    }
    expect((await store.getMove("m_astana"))!.lastBoxNumber).toBe(12);
  });
});

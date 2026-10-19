import { describe, it, expect } from "vitest";
import { generateCode, formatCode, normalizeCode, CODE_ALPHABET } from "../src/codes";
import { visitorView, pinAttemptState, shouldCountScan, type AccessTag } from "../src/access";

describe("codes", () => {
  it("generates 8 characters from the alphabet without look-alikes", () => {
    for (let i = 0; i < 200; i++) {
      const c = generateCode();
      expect(c).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
    }
    expect(CODE_ALPHABET).not.toMatch(/[01ILO]/);
  });
  it("is deterministic with an injected random source", () => {
    expect(generateCode(() => 0)).toBe("22222222");
    expect(generateCode(() => 0.9999)).toBe("ZZZZZZZZ");
  });
  it("formats 4+4", () => expect(formatCode("7KQ4M2XP")).toBe("7KQ4 M2XP"));
  it("normalises typed codes", () => {
    expect(normalizeCode(" 7kq4-m2xp ")).toBe("7KQ4M2XP");
    expect(normalizeCode("7KQ4 M2XP")).toBe("7KQ4M2XP");
    expect(normalizeCode("7KQ4M2X")).toBeNull();
    expect(normalizeCode("7KQ4M2X0")).toBeNull();
    expect(normalizeCode("")).toBeNull();
    expect(normalizeCode(undefined)).toBeNull();
  });
});

describe("visitorView", () => {
  const now = new Date("2026-10-19T10:00:00Z");
  const ctx = { now, unlocked: false, isOwner: false };
  const tag = (p: Partial<AccessTag> = {}): AccessTag => ({ status: "active", privacy: "public", opensAt: null, ...p });
  const future = "2027-02-14T04:00:00.000Z";

  it("unknown", () => expect(visitorView(null, ctx).state).toBe("unknown"));
  it("open public tag", () => expect(visitorView(tag(), ctx)).toEqual({ state: "open", preview: false }));
  it("archived wins over everything for visitors", () => {
    expect(visitorView(tag({ status: "archived", privacy: "private", opensAt: future }), ctx).state).toBe("archived");
  });
  it("private before time lock", () => {
    expect(visitorView(tag({ privacy: "private", opensAt: future }), ctx).state).toBe("private");
  });
  it("time lock before PIN", () => {
    expect(visitorView(tag({ privacy: "pin", opensAt: future }), ctx).state).toBe("timeLocked");
    expect(visitorView(tag({ privacy: "pin", opensAt: future }), { ...ctx, unlocked: true }).state).toBe("timeLocked");
  });
  it("PIN required until unlocked", () => {
    expect(visitorView(tag({ privacy: "pin" }), ctx).state).toBe("pinRequired");
    expect(visitorView(tag({ privacy: "pin" }), { ...ctx, unlocked: true }).state).toBe("open");
  });
  it("opens at exactly opensAt", () => {
    const t = tag({ opensAt: now.toISOString() });
    expect(visitorView(t, ctx).state).toBe("open");
    expect(visitorView(t, { ...ctx, now: new Date(now.getTime() - 1000) }).state).toBe("timeLocked");
  });
  it("owner always previews", () => {
    for (const t of [tag({ status: "archived" }), tag({ privacy: "private" }), tag({ opensAt: future }), tag({ privacy: "pin" })]) {
      expect(visitorView(t, { ...ctx, isOwner: true })).toEqual({ state: "open", preview: true });
    }
  });
});

describe("pinAttemptState", () => {
  const now = new Date("2026-10-19T10:00:00Z");
  const ago = (min: number) => new Date(now.getTime() - min * 60_000).toISOString();
  it("counts only the last 15 minutes", () => {
    expect(pinAttemptState([], now)).toEqual({ attemptsLeft: 5, lockedUntil: null });
    expect(pinAttemptState([ago(1), ago(2), ago(20)], now)).toEqual({ attemptsLeft: 3, lockedUntil: null });
  });
  it("locks for 15 minutes after the fifth wrong PIN", () => {
    const r = pinAttemptState([ago(5), ago(4), ago(3), ago(2), ago(1)], now);
    expect(r.attemptsLeft).toBe(0);
    expect(r.lockedUntil).toBe(new Date(now.getTime() + 14 * 60_000).toISOString());
  });
});

describe("shouldCountScan (#56)", () => {
  const now = new Date("2026-10-19T12:00:00Z");
  const at = (min: number) => new Date(now.getTime() - min * 60_000).toISOString();
  it("counts the first view", () => {
    expect(shouldCountScan([], "v1", now)).toBe(true);
  });
  it("does not count the same visitor again within 30 minutes", () => {
    expect(shouldCountScan([{ visitorId: "v1", at: at(0) }], "v1", now)).toBe(false);
    expect(shouldCountScan([{ visitorId: "v1", at: at(29) }], "v1", now)).toBe(false);
  });
  it("counts the same visitor again after 30 minutes", () => {
    expect(shouldCountScan([{ visitorId: "v1", at: at(31) }], "v1", now)).toBe(true);
  });
  it("counts another visitor, and ignores old scans without a visitor id", () => {
    expect(shouldCountScan([{ visitorId: "v1", at: at(1) }, { visitorId: null, at: at(1) }], "v2", now)).toBe(true);
  });
});

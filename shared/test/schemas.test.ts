import { describe, it, expect } from "vitest";
import {
  signUpSchema,
  logInSchema,
  tagInputSchema,
  pinSchema,
  moveInputSchema,
  replyInputSchema,
  mediaCaptionSchema,
  checkMediaFile,
  fieldErrors,
  MAX_MEDIA_PER_TAG,
} from "../src/schemas";

const s = (n: number, c = "a") => c.repeat(n);
const gift = { kind: "gift", title: "Keys", message: "" };
const box = { kind: "box", title: "Kitchen 1", moveId: "m1", room: "Kitchen", contents: ["Kettle"] };

describe("signUpSchema", () => {
  it("accepts a valid account and normalises email", () => {
    const r = signUpSchema.parse({ name: "  Aigerim ", email: " A@Example.COM ", password: "12345678" });
    expect(r).toEqual({ name: "Aigerim", email: "a@example.com", password: "12345678" });
  });
  it("name limits 1..60", () => {
    expect(signUpSchema.safeParse({ name: "   ", email: "a@b.kz", password: "12345678" }).success).toBe(false);
    expect(signUpSchema.safeParse({ name: s(60), email: "a@b.kz", password: "12345678" }).success).toBe(true);
    expect(signUpSchema.safeParse({ name: s(61), email: "a@b.kz", password: "12345678" }).success).toBe(false);
  });
  it("password 8..100", () => {
    const base = { name: "A", email: "a@b.kz" };
    expect(signUpSchema.safeParse({ ...base, password: s(7) }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, password: s(8) }).success).toBe(true);
    expect(signUpSchema.safeParse({ ...base, password: s(100) }).success).toBe(true);
    expect(signUpSchema.safeParse({ ...base, password: s(101) }).success).toBe(false);
  });
  it("rejects a bad email with a readable message", () => {
    const r = signUpSchema.safeParse({ name: "A", email: "nope", password: "12345678" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).email).toBe("Enter a valid email address");
  });
  it("log in needs both fields", () => {
    expect(logInSchema.safeParse({ email: "a@b.kz", password: "" }).success).toBe(false);
  });
});

describe("tagInputSchema", () => {
  it("accepts a minimal gift with defaults", () => {
    const r = tagInputSchema.parse(gift);
    expect(r.theme).toBe("paper");
    expect(r.privacy).toBe("public");
    expect(r.recipient).toBeNull();
    expect(r.opensAt).toBeNull();
  });
  it("title 1..80 after trimming", () => {
    expect(tagInputSchema.safeParse({ ...gift, title: "  " }).success).toBe(false);
    expect(tagInputSchema.safeParse({ ...gift, title: s(80) }).success).toBe(true);
    expect(tagInputSchema.safeParse({ ...gift, title: s(81) }).success).toBe(false);
  });
  it("recipient 0..60, empty becomes null", () => {
    expect(tagInputSchema.parse({ ...gift, recipient: "  " }).recipient).toBeNull();
    expect(tagInputSchema.safeParse({ ...gift, recipient: s(60) }).success).toBe(true);
    expect(tagInputSchema.safeParse({ ...gift, recipient: s(61) }).success).toBe(false);
  });
  it("message up to 5000", () => {
    expect(tagInputSchema.safeParse({ ...gift, message: s(5000) }).success).toBe(true);
    expect(tagInputSchema.safeParse({ ...gift, message: s(5001) }).success).toBe(false);
  });
  it("rejects unknown kind, theme and privacy", () => {
    expect(tagInputSchema.safeParse({ ...gift, kind: "car" }).success).toBe(false);
    expect(tagInputSchema.safeParse({ ...gift, theme: "neon" }).success).toBe(false);
    expect(tagInputSchema.safeParse({ ...gift, privacy: "friends" }).success).toBe(false);
  });
  it("opensAt must be an ISO date-time", () => {
    expect(tagInputSchema.safeParse({ ...gift, opensAt: "2027-02-14T04:00:00.000Z" }).success).toBe(true);
    expect(tagInputSchema.safeParse({ ...gift, opensAt: "tomorrow" }).success).toBe(false);
  });
  it("box needs a move and a room", () => {
    const r = tagInputSchema.safeParse({ kind: "box", title: "B" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const f = fieldErrors(r.error);
      expect(f.moveId).toBe("Choose a move for this box");
      expect(f.room).toBe("Room is required for a box");
    }
  });
  it("box contents: empty rows dropped, max 100 items of 80 chars", () => {
    expect(tagInputSchema.parse({ ...box, contents: ["Kettle", "  ", "Cups"] }).contents).toEqual(["Kettle", "Cups"]);
    expect(tagInputSchema.safeParse({ ...box, contents: Array(100).fill("x") }).success).toBe(true);
    expect(tagInputSchema.safeParse({ ...box, contents: Array(101).fill("x") }).success).toBe(false);
    expect(tagInputSchema.safeParse({ ...box, contents: [s(80)] }).success).toBe(true);
    expect(tagInputSchema.safeParse({ ...box, contents: [s(81)] }).success).toBe(false);
  });
  it("room max 40", () => {
    expect(tagInputSchema.safeParse({ ...box, room: s(40) }).success).toBe(true);
    expect(tagInputSchema.safeParse({ ...box, room: s(41) }).success).toBe(false);
  });
  it("clears box fields for non-box kinds and recipient for boxes", () => {
    const r = tagInputSchema.parse({ ...gift, moveId: "m1", room: "Kitchen", contents: ["x"], fragile: true });
    expect(r).toMatchObject({ moveId: null, room: null, contents: [], fragile: false });
    expect(tagInputSchema.parse({ ...box, recipient: "Mom" }).recipient).toBeNull();
  });
  it("validates the PIN when given", () => {
    expect(tagInputSchema.safeParse({ ...gift, privacy: "pin", pin: "12a4" }).success).toBe(false);
    expect(tagInputSchema.safeParse({ ...gift, privacy: "pin", pin: "0123" }).success).toBe(true);
  });
});

describe("pinSchema", () => {
  it.each([["0123", true], ["123456", true], ["123", false], ["1234567", false], ["12a4", false], [" 1234", false]])(
    "%s -> %s",
    (pin, ok) => {
      expect(pinSchema.safeParse(pin).success).toBe(ok);
    },
  );
});

describe("moveInputSchema", () => {
  it("name 1..60, addresses 0..120, date YYYY-MM-DD", () => {
    expect(moveInputSchema.parse({ name: "Almaty → Astana" })).toEqual({
      name: "Almaty → Astana",
      fromAddress: null,
      toAddress: null,
      date: null,
    });
    expect(moveInputSchema.safeParse({ name: s(61) }).success).toBe(false);
    expect(moveInputSchema.safeParse({ name: "M", fromAddress: s(120) }).success).toBe(true);
    expect(moveInputSchema.safeParse({ name: "M", toAddress: s(121) }).success).toBe(false);
    expect(moveInputSchema.safeParse({ name: "M", date: "2026-11-12" }).success).toBe(true);
    expect(moveInputSchema.safeParse({ name: "M", date: "12.11.2026" }).success).toBe(false);
  });
});

describe("replyInputSchema", () => {
  it("name 1..60 and message 1..1000", () => {
    expect(replyInputSchema.safeParse({ name: "Dana", message: "Рахмет!" }).success).toBe(true);
    expect(replyInputSchema.safeParse({ name: "", message: "x" }).success).toBe(false);
    expect(replyInputSchema.safeParse({ name: s(61), message: "x" }).success).toBe(false);
    expect(replyInputSchema.safeParse({ name: "D", message: "   " }).success).toBe(false);
    expect(replyInputSchema.safeParse({ name: "D", message: s(1000) }).success).toBe(true);
    expect(replyInputSchema.safeParse({ name: "D", message: s(1001) }).success).toBe(false);
  });
});

describe("media", () => {
  const MB = 1024 * 1024;
  it("detects types and size limits at the edge", () => {
    expect(checkMediaFile("image/jpeg", 10 * MB)).toEqual({ ok: true, type: "photo" });
    expect(checkMediaFile("image/png", 10 * MB + 1).ok).toBe(false);
    expect(checkMediaFile("video/mp4", 50 * MB)).toEqual({ ok: true, type: "video" });
    expect(checkMediaFile("video/webm", 50 * MB + 1).ok).toBe(false);
    expect(checkMediaFile("audio/webm;codecs=opus", 20 * MB)).toEqual({ ok: true, type: "audio" });
    expect(checkMediaFile("audio/mpeg", 20 * MB + 1).ok).toBe(false);
  });
  it("rejects other types and empty files", () => {
    expect(checkMediaFile("application/pdf", 10)).toEqual({ ok: false, error: expect.stringContaining("not supported") });
    expect(checkMediaFile("image/gif", 10).ok).toBe(false);
    expect(checkMediaFile("image/jpeg", 0).ok).toBe(false);
  });
  it("caption up to 200", () => {
    expect(mediaCaptionSchema.safeParse("x".repeat(200)).success).toBe(true);
    expect(mediaCaptionSchema.safeParse("x".repeat(201)).success).toBe(false);
    expect(mediaCaptionSchema.parse(null)).toBe("");
  });
  it("max 20 per tag", () => {
    expect(MAX_MEDIA_PER_TAG).toBe(20);
  });
});

import { SEED_MOVES, SEED_TAGS, SEED_USERS } from "@moveeasy/shared";
import type { DB } from "./db";

const DAY = 86_400_000;

export function buildSeed(now = new Date()): DB {
  const t = now.getTime();
  const iso = (ms: number) => new Date(ms).toISOString();
  const db: DB = { users: [], sessions: [], moves: [], tags: [], media: [], replies: [], scans: [], pinFailures: [], unlocks: [], seq: 1 };
  for (const u of SEED_USERS) db.users.push({ id: u.id, name: u.name, email: u.email, password: u.password, createdAt: iso(t - 60 * DAY) });
  for (const m of SEED_MOVES)
    db.moves.push({ id: m.id, ownerId: m.owner, name: m.name, fromAddress: m.fromAddress, toAddress: m.toAddress, date: m.date, lastBoxNumber: m.lastBoxNumber, createdAt: iso(t - m.daysAgo * DAY) });
  for (const s of SEED_TAGS) {
    const created = iso(t - s.daysAgo * DAY);
    db.tags.push({
      id: s.id, ownerId: s.owner, code: s.code, kind: s.kind, title: s.title, recipient: s.recipient, message: s.message, theme: s.theme,
      privacy: s.privacy, pin: s.pin, opensAt: s.opensInDays === null ? null : iso(Math.ceil((t + s.opensInDays * DAY) / 3_600_000) * 3_600_000),
      allowReplies: s.allowReplies, status: s.archived ? "archived" : "active", moveId: s.moveId, boxNumber: s.boxNumber, room: s.room,
      contents: s.contents, fragile: s.fragile, createdAt: created, updatedAt: created,
    });
    s.media.forEach((m, i) =>
      db.media.push({ id: `${s.id}_m${i + 1}`, tagId: s.id, type: m.type, mimeType: m.mimeType, size: m.size, caption: m.caption, position: i, url: `/demo/${m.file}`, createdAt: created, sessionOnly: false }),
    );
    s.replies.forEach((r, i) =>
      db.replies.push({ id: `${s.id}_r${i + 1}`, tagId: s.id, name: r.name, message: r.message, read: r.read, createdAt: iso(t - r.minutesAgo * 60_000) }),
    );
    for (const d of s.scansDaysAgo) db.scans.push({ tagId: s.id, at: iso(t - d * DAY - 3_600_000), visitorId: null });
  }
  return db;
}

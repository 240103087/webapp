import { statSync } from "node:fs";
import path from "node:path";
import { SEED_MOVES, SEED_TAGS, SEED_USERS } from "@moveeasy/shared";
import { REPO_ROOT } from "../config";
import { EXT_BY_MIME, type FileStore } from "../files";
import { hashSecret } from "../hash";
import type { Store } from "./types";

const DAY = 86_400_000;
export const DEMO_MEDIA_DIR = path.join(REPO_ROOT, "frontend/public/demo");

/**
 * Loads the same demo data as the mock services layer (`shared/src/seed.ts`):
 * two users, two moves, 17 tags with media, replies and scans. Dates are relative to `now`.
 * Demo files are copied into the upload folder.
 */
export async function seedStore(store: Store, files: FileStore, now = new Date()): Promise<void> {
  const t = now.getTime();
  const iso = (ms: number) => new Date(ms).toISOString();
  for (const u of SEED_USERS)
    await store.insertUser({ id: u.id, name: u.name, email: u.email, passwordHash: await hashSecret(u.password), createdAt: iso(t - 60 * DAY) });
  for (const m of SEED_MOVES)
    await store.insertMove({
      id: m.id, ownerId: m.owner, name: m.name, fromAddress: m.fromAddress, toAddress: m.toAddress, date: m.date,
      lastBoxNumber: m.lastBoxNumber, createdAt: iso(t - m.daysAgo * DAY),
    });
  for (const s of SEED_TAGS) {
    const created = iso(t - s.daysAgo * DAY);
    await store.insertTag({
      id: s.id, ownerId: s.owner, code: s.code, kind: s.kind, title: s.title, recipient: s.recipient, message: s.message, theme: s.theme,
      privacy: s.privacy, pinHash: s.pin ? await hashSecret(s.pin) : null,
      opensAt: s.opensInDays === null ? null : iso(Math.ceil((t + s.opensInDays * DAY) / 3_600_000) * 3_600_000),
      allowReplies: s.allowReplies, status: s.archived ? "archived" : "active", moveId: s.moveId, boxNumber: s.boxNumber, room: s.room,
      contents: s.contents, fragile: s.fragile, createdAt: created, updatedAt: created,
    });
    for (const [i, m] of s.media.entries()) {
      const id = `${s.id}_m${i + 1}`;
      const file = await files.put(s.id, id, EXT_BY_MIME[m.mimeType] ?? path.extname(m.file), path.join(DEMO_MEDIA_DIR, m.file), "copy");
      const size = statSync(files.abs(file)).size;
      await store.insertMedia({ id, tagId: s.id, type: m.type, mimeType: m.mimeType, size, caption: m.caption, position: i, file, createdAt: created });
    }
    for (const [i, r] of s.replies.entries())
      await store.insertReply({ id: `${s.id}_r${i + 1}`, tagId: s.id, name: r.name, message: r.message, read: r.read, createdAt: iso(t - r.minutesAgo * 60_000) });
    for (const [i, d] of s.scansDaysAgo.entries())
      await store.insertScan({ id: `${s.id}_s${i + 1}`, tagId: s.id, visitorId: null, at: iso(t - d * DAY - 3_600_000) });
  }
}

import { PrismaClient, type Prisma } from "@prisma/client";
import { rm } from "node:fs/promises";
import type { MediaType, Privacy, TagKind, Theme } from "@moveeasy/shared";
import type { Config } from "../config";
import { FileStore } from "../files";
import { seedStore } from "./seed";
import type {
  MediaRow, MoveRow, PinFailureRow, ReplyRow, ScanRow, SessionRow, Store, TagFilter, TagRow, UnlockRow, UserRow,
} from "./types";

/** The only file that imports Prisma. Dates are `Date` in the database and ISO strings everywhere else. */
const d = (iso: string) => new Date(iso);
const s = (date: Date) => date.toISOString();

type DbTag = Prisma.TagGetPayload<object>;
const tagOut = (t: DbTag): TagRow => ({
  id: t.id, ownerId: t.ownerId, code: t.code, kind: t.kind as TagKind, title: t.title, recipient: t.recipient, message: t.message,
  theme: t.theme as Theme, privacy: t.privacy as Privacy, pinHash: t.pinHash, opensAt: t.opensAt ? s(t.opensAt) : null,
  allowReplies: t.allowReplies, status: t.status as TagRow["status"], moveId: t.moveId, boxNumber: t.boxNumber, room: t.room,
  contents: JSON.parse(t.contents) as string[], fragile: t.fragile, createdAt: s(t.createdAt), updatedAt: s(t.updatedAt),
});
const tagIn = (t: TagRow) => ({
  id: t.id, ownerId: t.ownerId, code: t.code, kind: t.kind, title: t.title, recipient: t.recipient, message: t.message, theme: t.theme,
  privacy: t.privacy, pinHash: t.pinHash, opensAt: t.opensAt ? d(t.opensAt) : null, allowReplies: t.allowReplies, status: t.status,
  moveId: t.moveId, boxNumber: t.boxNumber, room: t.room, contents: JSON.stringify(t.contents), fragile: t.fragile,
  createdAt: d(t.createdAt), updatedAt: d(t.updatedAt),
});
type DbMove = Prisma.MoveGetPayload<object>;
const moveOut = (m: DbMove): MoveRow => ({
  id: m.id, ownerId: m.ownerId, name: m.name, fromAddress: m.fromAddress, toAddress: m.toAddress, date: m.date, lastBoxNumber: m.lastBoxNumber, createdAt: s(m.createdAt),
});
const moveIn = (m: MoveRow) => ({ ...m, createdAt: d(m.createdAt) });
type DbMedia = Prisma.MediaGetPayload<object>;
const mediaOut = (m: DbMedia): MediaRow => ({ ...m, type: m.type as MediaType, createdAt: s(m.createdAt) });
const mediaIn = (m: MediaRow) => ({ ...m, createdAt: d(m.createdAt) });
type DbReply = Prisma.ReplyGetPayload<object>;
const replyOut = (r: DbReply): ReplyRow => ({ ...r, createdAt: s(r.createdAt) });

export class PrismaStore implements Store {
  readonly kind = "prisma" as const;
  constructor(private db: PrismaClient) {}

  static open(databaseUrl: string): PrismaStore {
    return new PrismaStore(new PrismaClient({ datasources: { db: { url: databaseUrl } } }));
  }

  async insertUser(u: UserRow) { await this.db.user.create({ data: { ...u, createdAt: d(u.createdAt) } }); }
  async getUser(id: string) { const u = await this.db.user.findUnique({ where: { id } }); return u && { ...u, createdAt: s(u.createdAt) }; }
  async getUserByEmail(email: string) { const u = await this.db.user.findUnique({ where: { email } }); return u && { ...u, createdAt: s(u.createdAt) }; }

  async insertSession(x: SessionRow) { await this.db.session.create({ data: { ...x, createdAt: d(x.createdAt) } }); }
  async getSession(token: string) { const x = await this.db.session.findUnique({ where: { token } }); return x && { ...x, createdAt: s(x.createdAt) }; }
  async deleteSession(token: string) { await this.db.session.deleteMany({ where: { token } }); }

  async insertMove(m: MoveRow) { await this.db.move.create({ data: moveIn(m) }); }
  async updateMove(m: MoveRow) {
    // lastBoxNumber is only changed by nextBoxNumber, so a stale copy cannot lower it.
    const { lastBoxNumber: _skip, ...rest } = moveIn(m);
    await this.db.move.update({ where: { id: m.id }, data: rest });
  }
  async deleteMove(id: string) { await this.db.move.deleteMany({ where: { id } }); }
  async getMove(id: string) { const m = await this.db.move.findUnique({ where: { id } }); return m && moveOut(m); }
  async listMoves(ownerId: string) { return (await this.db.move.findMany({ where: { ownerId } })).map(moveOut); }
  async nextBoxNumber(moveId: string) {
    // One atomic UPDATE ... SET lastBoxNumber = lastBoxNumber + 1, so two boxes never share a number.
    const m = await this.db.move.update({ where: { id: moveId }, data: { lastBoxNumber: { increment: 1 } }, select: { lastBoxNumber: true } });
    return m.lastBoxNumber;
  }

  async insertTag(t: TagRow) { await this.db.tag.create({ data: tagIn(t) }); }
  async updateTag(t: TagRow) { await this.db.tag.update({ where: { id: t.id }, data: tagIn(t) }); }
  async deleteTag(id: string) { await this.db.tag.deleteMany({ where: { id } }); } // media, replies, scans, PIN failures and unlocks cascade
  async getTag(id: string) { const t = await this.db.tag.findUnique({ where: { id } }); return t && tagOut(t); }
  async getTagByCode(code: string) { const t = await this.db.tag.findUnique({ where: { code } }); return t && tagOut(t); }
  async listTags(f: TagFilter) { return (await this.db.tag.findMany({ where: { ownerId: f.ownerId, moveId: f.moveId } })).map(tagOut); }

  async insertMedia(m: MediaRow) { await this.db.media.create({ data: mediaIn(m) }); }
  async updateMedia(m: MediaRow) { await this.db.media.update({ where: { id: m.id }, data: mediaIn(m) }); }
  async deleteMedia(id: string) { await this.db.media.deleteMany({ where: { id } }); }
  async getMedia(id: string) { const m = await this.db.media.findUnique({ where: { id } }); return m && mediaOut(m); }
  async listMedia(tagIds: string[]) {
    return (await this.db.media.findMany({ where: { tagId: { in: tagIds } }, orderBy: [{ tagId: "asc" }, { position: "asc" }] })).map(mediaOut);
  }

  async insertReply(r: ReplyRow) { await this.db.reply.create({ data: { ...r, createdAt: d(r.createdAt) } }); }
  async getReply(id: string) { const r = await this.db.reply.findUnique({ where: { id } }); return r && replyOut(r); }
  async deleteReply(id: string) { await this.db.reply.deleteMany({ where: { id } }); }
  async markRepliesRead(tagId: string) { await this.db.reply.updateMany({ where: { tagId }, data: { read: true } }); }
  async listReplies(tagIds: string[]) {
    return (await this.db.reply.findMany({ where: { tagId: { in: tagIds } }, orderBy: { createdAt: "desc" } })).map(replyOut);
  }

  async insertScan(x: ScanRow) { await this.db.scan.create({ data: { ...x, at: d(x.at) } }); }
  async listScans(tagIds: string[]) { return (await this.db.scan.findMany({ where: { tagId: { in: tagIds } } })).map((x) => ({ ...x, at: s(x.at) })); }

  async insertPinFailure(f: PinFailureRow) { await this.db.pinFailure.create({ data: { ...f, at: d(f.at) } }); }
  async listPinFailures(tagId: string, visitorId: string) {
    return (await this.db.pinFailure.findMany({ where: { tagId, visitorId } })).map((f) => ({ ...f, at: s(f.at) }));
  }
  async clearPinFailures(tagId: string, visitorId: string) { await this.db.pinFailure.deleteMany({ where: { tagId, visitorId } }); }

  async insertUnlock(u: UnlockRow) { await this.db.unlock.create({ data: { ...u, expiresAt: d(u.expiresAt) } }); }
  async deleteUnlocks(tagId: string) { await this.db.unlock.deleteMany({ where: { tagId } }); }
  async getUnlock(token: string) { const u = await this.db.unlock.findUnique({ where: { token } }); return u && { ...u, expiresAt: s(u.expiresAt) }; }

  async isEmpty() { return (await this.db.user.count()) === 0; }
  async close() { await this.db.$disconnect(); }

  /** Deletes every row (used by `npm run db:seed`). */
  async clear() {
    await this.db.$transaction([
      this.db.unlock.deleteMany(), this.db.pinFailure.deleteMany(), this.db.scan.deleteMany(), this.db.reply.deleteMany(),
      this.db.media.deleteMany(), this.db.tag.deleteMany(), this.db.move.deleteMany(), this.db.session.deleteMany(), this.db.user.deleteMany(),
    ]);
  }
}

/** `npm run db:seed`: migrates, deletes all data and uploaded files, and loads the demo data. */
export async function resetAndSeed(config: Config, now = new Date()): Promise<void> {
  const { migrate } = await import("../migrate");
  migrate(config.databaseUrl);
  const store = PrismaStore.open(config.databaseUrl);
  try {
    await store.clear();
    await rm(config.uploadDir, { recursive: true, force: true });
    await seedStore(store, new FileStore(config.uploadDir), now);
  } finally {
    await store.close();
  }
}

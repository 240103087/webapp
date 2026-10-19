import type { MediaType, Privacy, TagKind, Theme } from "@moveeasy/shared";

/**
 * Row types and the storage interface. The store only stores: every rule
 * (validation, privacy, box numbering policy, limits) lives in `service.ts`,
 * so the memory store and the Prisma store behave the same by construction.
 * Times are ISO strings in UTC.
 */
export interface UserRow { id: string; name: string; email: string; passwordHash: string; createdAt: string }
export interface SessionRow { token: string; userId: string; createdAt: string }
export interface MoveRow {
  id: string; ownerId: string; name: string; fromAddress: string | null; toAddress: string | null; date: string | null;
  lastBoxNumber: number; createdAt: string;
}
export interface TagRow {
  id: string; ownerId: string; code: string; kind: TagKind; title: string; recipient: string | null; message: string; theme: Theme;
  privacy: Privacy; pinHash: string | null; opensAt: string | null; allowReplies: boolean; status: "active" | "archived";
  moveId: string | null; boxNumber: number | null; room: string | null; contents: string[]; fragile: boolean;
  createdAt: string; updatedAt: string;
}
export interface MediaRow {
  id: string; tagId: string; type: MediaType; mimeType: string; size: number; caption: string; position: number;
  /** Path of the file relative to `UPLOAD_DIR`. */
  file: string;
  createdAt: string;
}
export interface ReplyRow { id: string; tagId: string; name: string; message: string; read: boolean; createdAt: string }
export interface ScanRow { id: string; tagId: string; visitorId: string | null; at: string }
export interface PinFailureRow { id: string; tagId: string; visitorId: string; at: string }
export interface UnlockRow { token: string; tagId: string; expiresAt: string }

export interface TagFilter { ownerId?: string; moveId?: string }

export interface Store {
  readonly kind: "memory" | "prisma";

  insertUser(u: UserRow): Promise<void>;
  getUser(id: string): Promise<UserRow | null>;
  getUserByEmail(email: string): Promise<UserRow | null>;

  insertSession(s: SessionRow): Promise<void>;
  getSession(token: string): Promise<SessionRow | null>;
  deleteSession(token: string): Promise<void>;

  insertMove(m: MoveRow): Promise<void>;
  updateMove(m: MoveRow): Promise<void>;
  deleteMove(id: string): Promise<void>;
  getMove(id: string): Promise<MoveRow | null>;
  listMoves(ownerId: string): Promise<MoveRow[]>;
  /** Atomically increments the move's last box number and returns it. Numbers are never reused. */
  nextBoxNumber(moveId: string): Promise<number>;

  insertTag(t: TagRow): Promise<void>;
  updateTag(t: TagRow): Promise<void>;
  /** Also deletes the tag's media rows, replies, scans, PIN failures and unlocks. */
  deleteTag(id: string): Promise<void>;
  getTag(id: string): Promise<TagRow | null>;
  getTagByCode(code: string): Promise<TagRow | null>;
  listTags(filter: TagFilter): Promise<TagRow[]>;

  insertMedia(m: MediaRow): Promise<void>;
  updateMedia(m: MediaRow): Promise<void>;
  deleteMedia(id: string): Promise<void>;
  getMedia(id: string): Promise<MediaRow | null>;
  /** Media of these tags, ordered by tag then position. */
  listMedia(tagIds: string[]): Promise<MediaRow[]>;

  insertReply(r: ReplyRow): Promise<void>;
  getReply(id: string): Promise<ReplyRow | null>;
  deleteReply(id: string): Promise<void>;
  markRepliesRead(tagId: string): Promise<void>;
  /** Replies of these tags, newest first. */
  listReplies(tagIds: string[]): Promise<ReplyRow[]>;

  insertScan(s: ScanRow): Promise<void>;
  listScans(tagIds: string[]): Promise<ScanRow[]>;

  insertPinFailure(f: PinFailureRow): Promise<void>;
  listPinFailures(tagId: string, visitorId: string): Promise<PinFailureRow[]>;
  clearPinFailures(tagId: string, visitorId: string): Promise<void>;

  insertUnlock(u: UnlockRow): Promise<void>;
  getUnlock(token: string): Promise<UnlockRow | null>;

  /** True when there are no users (used to decide whether to seed). */
  isEmpty(): Promise<boolean>;
  close(): Promise<void>;
}

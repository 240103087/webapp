import type {
  MediaRow, MoveRow, PinFailureRow, ReplyRow, ScanRow, SessionRow, Store, TagFilter, TagRow, UnlockRow, UserRow,
} from "./types";

const copy = <T>(x: T): T => structuredClone(x);

/** Keeps everything in arrays. Data is lost on restart (iteration 3). */
export class MemoryStore implements Store {
  readonly kind = "memory" as const;
  private users: UserRow[] = [];
  private sessions: SessionRow[] = [];
  private moves: MoveRow[] = [];
  private tags: TagRow[] = [];
  private media: MediaRow[] = [];
  private replies: ReplyRow[] = [];
  private scans: ScanRow[] = [];
  private pinFailures: PinFailureRow[] = [];
  private unlocks: UnlockRow[] = [];

  async insertUser(u: UserRow) { this.users.push(copy(u)); }
  async getUser(id: string) { return copy(this.users.find((u) => u.id === id) ?? null); }
  async getUserByEmail(email: string) { return copy(this.users.find((u) => u.email === email) ?? null); }

  async insertSession(s: SessionRow) { this.sessions.push(copy(s)); }
  async getSession(token: string) { return copy(this.sessions.find((s) => s.token === token) ?? null); }
  async deleteSession(token: string) { this.sessions = this.sessions.filter((s) => s.token !== token); }

  async insertMove(m: MoveRow) { this.moves.push(copy(m)); }
  async updateMove(m: MoveRow) { this.replace(this.moves, m); }
  async deleteMove(id: string) { this.moves = this.moves.filter((m) => m.id !== id); }
  async getMove(id: string) { return copy(this.moves.find((m) => m.id === id) ?? null); }
  async listMoves(ownerId: string) { return copy(this.moves.filter((m) => m.ownerId === ownerId)); }
  async nextBoxNumber(moveId: string) {
    const m = this.moves.find((x) => x.id === moveId);
    if (!m) throw new Error(`No move ${moveId}`);
    return ++m.lastBoxNumber;
  }

  async insertTag(t: TagRow) { this.tags.push(copy(t)); }
  async updateTag(t: TagRow) { this.replace(this.tags, t); }
  async deleteTag(id: string) {
    this.tags = this.tags.filter((t) => t.id !== id);
    this.media = this.media.filter((m) => m.tagId !== id);
    this.replies = this.replies.filter((r) => r.tagId !== id);
    this.scans = this.scans.filter((s) => s.tagId !== id);
    this.pinFailures = this.pinFailures.filter((f) => f.tagId !== id);
    this.unlocks = this.unlocks.filter((u) => u.tagId !== id);
  }
  async getTag(id: string) { return copy(this.tags.find((t) => t.id === id) ?? null); }
  async getTagByCode(code: string) { return copy(this.tags.find((t) => t.code === code) ?? null); }
  async listTags(f: TagFilter) {
    return copy(this.tags.filter((t) => (f.ownerId === undefined || t.ownerId === f.ownerId) && (f.moveId === undefined || t.moveId === f.moveId)));
  }

  async insertMedia(m: MediaRow) { this.media.push(copy(m)); }
  async updateMedia(m: MediaRow) { this.replace(this.media, m); }
  async deleteMedia(id: string) { this.media = this.media.filter((m) => m.id !== id); }
  async getMedia(id: string) { return copy(this.media.find((m) => m.id === id) ?? null); }
  async listMedia(tagIds: string[]) {
    const ids = new Set(tagIds);
    return copy(this.media.filter((m) => ids.has(m.tagId)).sort((a, b) => a.tagId.localeCompare(b.tagId) || a.position - b.position));
  }

  async insertReply(r: ReplyRow) { this.replies.push(copy(r)); }
  async getReply(id: string) { return copy(this.replies.find((r) => r.id === id) ?? null); }
  async deleteReply(id: string) { this.replies = this.replies.filter((r) => r.id !== id); }
  async markRepliesRead(tagId: string) { for (const r of this.replies) if (r.tagId === tagId) r.read = true; }
  async listReplies(tagIds: string[]) {
    const ids = new Set(tagIds);
    return copy(this.replies.filter((r) => ids.has(r.tagId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  async insertScan(s: ScanRow) { this.scans.push(copy(s)); }
  async listScans(tagIds: string[]) {
    const ids = new Set(tagIds);
    return copy(this.scans.filter((s) => ids.has(s.tagId)));
  }

  async insertPinFailure(f: PinFailureRow) { this.pinFailures.push(copy(f)); }
  async listPinFailures(tagId: string, visitorId: string) {
    return copy(this.pinFailures.filter((f) => f.tagId === tagId && f.visitorId === visitorId));
  }
  async clearPinFailures(tagId: string, visitorId: string) {
    this.pinFailures = this.pinFailures.filter((f) => !(f.tagId === tagId && f.visitorId === visitorId));
  }

  async insertUnlock(u: UnlockRow) { this.unlocks.push(copy(u)); }
  async getUnlock(token: string) { return copy(this.unlocks.find((u) => u.token === token) ?? null); }

  async isEmpty() { return this.users.length === 0; }
  async close() {}

  private replace<T extends { id: string }>(list: T[], row: T) {
    const i = list.findIndex((x) => x.id === row.id);
    if (i < 0) throw new Error(`No row ${row.id}`);
    list[i] = copy(row);
  }
}

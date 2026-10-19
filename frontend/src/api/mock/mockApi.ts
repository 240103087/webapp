import {
  MAX_MEDIA_PER_TAG,
  checkMediaFile,
  fieldErrors,
  generateCode,
  groupByRoom,
  logInSchema,
  mediaCaptionSchema,
  moveInputSchema,
  normalizeCode,
  pinAttemptState,
  shouldCountScan,
  replyInputSchema,
  searchContents,
  signUpSchema,
  tagInputSchema,
  visitorView,
  PIN_LOCK_MINUTES,
  UNLOCK_HOURS,
  type Media,
  type Move,
  type MoveDetail,
  type PublicTagView,
  type Reply,
  type Session,
  type Stats,
  type Tag,
  type TagInput,
  type TagQuery,
  type User,
} from "@moveeasy/shared";
import type { ZodError } from "zod";
import { ApiError, type Api, type UploadOptions } from "../types";
import { getToken, getUnlock, getVisitorId, saveUnlock, setToken } from "../clientState";
import type { DB, MediaRow, MoveRow, TagRow } from "./db";
import { buildSeed } from "./seed";

const STORAGE_KEY = "moveeasy.mock.v1";
const REPLY_LIMIT_PER_HOUR = 10;

/** Uploads up to this size are stored in localStorage in demo mode (#57). */
export const MOCK_PERSIST_MAX_BYTES = 1.5 * 1024 * 1024;

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function fail(status: number, code: string, message: string, extra: Partial<ApiError> = {}): never {
  throw new ApiError(status, { code, message, ...extra });
}
function validation(err: ZodError): never {
  const fields = fieldErrors(err);
  fail(422, "validation", Object.values(fields)[0] ?? "Some fields are not valid", { fields });
}

export interface MockOptions {
  /** Simulated latency range in ms; 0 in tests. */
  latency?: [number, number];
  now?: () => Date;
  storage?: boolean;
}

export function createMockApi(opts: MockOptions = {}): Api {
  const latency = opts.latency ?? [150, 400];
  const now = opts.now ?? (() => new Date());
  const persist = opts.storage ?? true;
  let db: DB = load();

  function load(): DB {
    if (persist) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as DB;
          // Files picked in an earlier page load are gone (object URLs die with the page).
          parsed.media = parsed.media.filter((m) => !m.sessionOnly);
          return parsed;
        }
      } catch {
        /* corrupted: fall back to the seed */
      }
    }
    return buildSeed(now());
  }
  function save() {
    if (!persist) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Storage full: save everything except uploaded files, which stay in memory for this page.
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...db, media: db.media.filter((m) => !m.url.startsWith("data:")) }));
      } catch {
        /* still full: keep working in memory */
      }
    }
  }
  async function delay() {
    const [a, b] = latency;
    if (b <= 0) return;
    await new Promise((r) => setTimeout(r, a + Math.random() * (b - a)));
  }
  const id = (p: string) => `${p}_${(db.seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const iso = () => now().toISOString();

  function currentUser(): User | null {
    const token = getToken();
    if (!token) return null;
    const s = db.sessions.find((x) => x.token === token);
    const u = s && db.users.find((x) => x.id === s.userId);
    return u ? { id: u.id, name: u.name, email: u.email, createdAt: u.createdAt } : null;
  }
  function requireUser(): User {
    const u = currentUser();
    if (!u) fail(401, "unauthorized", "Please log in");
    return u;
  }
  function ownTag(tagId: string): TagRow {
    const u = requireUser();
    const t = db.tags.find((x) => x.id === tagId && x.ownerId === u.id);
    if (!t) fail(404, "not_found", "Tag not found");
    return t;
  }
  function ownMove(moveId: string): MoveRow {
    const u = requireUser();
    const m = db.moves.find((x) => x.id === moveId && x.ownerId === u.id);
    if (!m) fail(404, "not_found", "Move not found");
    return m;
  }
  const mediaOf = (tagId: string) => db.media.filter((m) => m.tagId === tagId).sort((a, b) => a.position - b.position);
  const toMedia = (m: MediaRow): Media => ({ id: m.id, type: m.type, mimeType: m.mimeType, size: m.size, caption: m.caption, position: m.position, url: m.url, createdAt: m.createdAt });

  function toTag(t: TagRow): Tag {
    const scans = db.scans.filter((s) => s.tagId === t.id).map((s) => s.at).sort();
    const replies = db.replies.filter((r) => r.tagId === t.id);
    const media = mediaOf(t.id).map(toMedia);
    return {
      id: t.id, code: t.code, kind: t.kind, title: t.title, recipient: t.recipient, message: t.message, theme: t.theme, privacy: t.privacy,
      hasPin: t.pin !== null, opensAt: t.opensAt, allowReplies: t.allowReplies, status: t.status, moveId: t.moveId,
      moveName: t.moveId ? db.moves.find((m) => m.id === t.moveId)?.name ?? null : null,
      boxNumber: t.boxNumber, room: t.room, contents: [...t.contents], fragile: t.fragile,
      scanCount: scans.length, lastScanAt: scans[scans.length - 1] ?? null,
      replyCount: replies.length, unreadReplies: replies.filter((r) => !r.read).length,
      coverUrl: media.find((m) => m.type === "photo")?.url ?? null, media, createdAt: t.createdAt, updatedAt: t.updatedAt,
    };
  }
  function toMove(m: MoveRow): Move {
    return { id: m.id, name: m.name, fromAddress: m.fromAddress, toAddress: m.toAddress, date: m.date, boxCount: db.tags.filter((t) => t.moveId === m.id).length, createdAt: m.createdAt };
  }

  function applyTagInput(existing: TagRow | null, input: TagInput, ownerId: string): Omit<TagRow, "id" | "code" | "createdAt" | "ownerId"> {
    const r = tagInputSchema.safeParse(input);
    if (!r.success) validation(r.error);
    const v = r.data;
    const fields: Record<string, string> = {};
    const opensChanged = v.opensAt !== (existing?.opensAt ?? null);
    if (v.opensAt && opensChanged && Date.parse(v.opensAt) <= now().getTime()) fields.opensAt = "The open date must be in the future";
    let pin: string | null = existing?.pin ?? null;
    if (v.privacy === "pin") {
      if (v.pin) pin = v.pin;
      else if (!pin) fields.pin = "Set a PIN of 4 to 6 digits";
    } else pin = null;
    let boxNumber: number | null = null;
    if (v.kind === "box") {
      const move = db.moves.find((m) => m.id === v.moveId && m.ownerId === ownerId);
      if (!move) fields.moveId = "Choose a move for this box";
      else if (existing && existing.kind === "box" && existing.moveId === move.id && existing.boxNumber !== null) boxNumber = existing.boxNumber;
      else if (Object.keys(fields).length === 0) boxNumber = ++move.lastBoxNumber;
    }
    if (Object.keys(fields).length) fail(422, "validation", Object.values(fields)[0], { fields });
    return {
      kind: v.kind, title: v.title, recipient: v.recipient, message: v.message, theme: v.theme, privacy: v.privacy, pin, opensAt: v.opensAt,
      allowReplies: v.allowReplies, status: existing?.status ?? "active", moveId: v.moveId, boxNumber, room: v.room, contents: v.contents,
      fragile: v.fragile, updatedAt: iso(),
    };
  }

  function uniqueCode(): string {
    for (;;) {
      const c = generateCode();
      if (!db.tags.some((t) => t.code === c)) return c;
    }
  }

  function unlockedFor(tag: TagRow): boolean {
    const token = getUnlock(tag.code);
    return !!token && db.unlocks.some((u) => u.token === token && u.tagId === tag.id && Date.parse(u.expiresAt) > now().getTime());
  }
  function attemptState(tag: TagRow) {
    const visitor = getVisitorId();
    return pinAttemptState(db.pinFailures.filter((f) => f.tagId === tag.id && f.visitorId === visitor).map((f) => f.at), now());
  }

  const api: Api = {
    mode: "mock",

    async signUp(input) {
      await delay();
      const r = signUpSchema.safeParse(input);
      if (!r.success) validation(r.error);
      if (db.users.some((u) => u.email === r.data.email))
        fail(409, "email_taken", "An account with this email already exists", { fields: { email: "An account with this email already exists" } });
      const u = { id: id("u"), name: r.data.name, email: r.data.email, password: r.data.password, createdAt: iso() };
      db.users.push(u);
      return startSession(u.id);
    },
    async logIn(input) {
      await delay();
      const r = logInSchema.safeParse(input);
      if (!r.success) validation(r.error);
      const u = db.users.find((x) => x.email === r.data.email && x.password === r.data.password);
      if (!u) fail(401, "bad_credentials", "Email or password is wrong");
      return startSession(u.id);
    },
    async logOut() {
      const token = getToken();
      db.sessions = db.sessions.filter((s) => s.token !== token);
      setToken(null);
      save();
    },
    async me() {
      await delay();
      return currentUser();
    },

    async listTags(query: TagQuery = {}) {
      await delay();
      const u = requireUser();
      const q = query.q?.trim().toLocaleLowerCase();
      let list = db.tags.filter((t) => t.ownerId === u.id && (query.archived ? t.status === "archived" : t.status === "active"));
      if (q) list = list.filter((t) => t.title.toLocaleLowerCase().includes(q));
      if (query.kind) list = list.filter((t) => t.kind === query.kind);
      if (query.moveId) list = list.filter((t) => t.moveId === query.moveId);
      const tags = list.map(toTag);
      if (query.sort === "scans") tags.sort((a, b) => b.scanCount - a.scanCount || b.createdAt.localeCompare(a.createdAt));
      else tags.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return tags;
    },
    async getTag(tagId) {
      await delay();
      return toTag(ownTag(tagId));
    },
    async createTag(input) {
      await delay();
      const u = requireUser();
      const fields = applyTagInput(null, input, u.id);
      const row: TagRow = { id: id("t"), ownerId: u.id, code: uniqueCode(), createdAt: iso(), ...fields };
      db.tags.push(row);
      save();
      return toTag(row);
    },
    async updateTag(tagId, input) {
      await delay();
      const t = ownTag(tagId);
      Object.assign(t, applyTagInput(t, input, t.ownerId));
      save();
      return toTag(t);
    },
    async setArchived(tagId, archived) {
      await delay();
      const t = ownTag(tagId);
      t.status = archived ? "archived" : "active";
      t.updatedAt = iso();
      save();
      return toTag(t);
    },
    async deleteTag(tagId) {
      await delay();
      const t = ownTag(tagId);
      for (const m of mediaOf(t.id)) if (m.sessionOnly) URL.revokeObjectURL?.(m.url);
      db.tags = db.tags.filter((x) => x.id !== t.id);
      db.media = db.media.filter((m) => m.tagId !== t.id);
      db.replies = db.replies.filter((r) => r.tagId !== t.id);
      db.scans = db.scans.filter((s) => s.tagId !== t.id);
      save();
    },
    async getStats(): Promise<Stats> {
      await delay();
      const u = requireUser();
      const mine = db.tags.filter((t) => t.ownerId === u.id);
      const ids = new Set(mine.map((t) => t.id));
      const weekAgo = now().getTime() - 7 * 86_400_000;
      return {
        tags: mine.filter((t) => t.status === "active").length,
        scansThisWeek: db.scans.filter((s) => ids.has(s.tagId) && Date.parse(s.at) > weekAgo).length,
        unreadReplies: db.replies.filter((r) => ids.has(r.tagId) && !r.read).length,
      };
    },

    async uploadMedia(tagId, file, options: UploadOptions = {}) {
      const t = ownTag(tagId);
      const check = checkMediaFile(file.type, file.size);
      if (!check.ok) fail(422, "bad_file", check.error);
      if (mediaOf(t.id).length >= MAX_MEDIA_PER_TAG) fail(409, "too_many_media", `A tag can have at most ${MAX_MEDIA_PER_TAG} media files`);
      const caption = mediaCaptionSchema.safeParse(options.caption ?? "");
      if (!caption.success) validation(caption.error);
      for (let i = 1; i <= 4; i++) {
        await delay();
        options.onProgress?.(i / 4);
      }
      // Small files are kept as data URLs so they survive a reload; bigger ones live only as long as the page.
      const keep = file.size <= MOCK_PERSIST_MAX_BYTES;
      const row: MediaRow = {
        id: id("m"), tagId: t.id, type: check.type, mimeType: file.type.split(";")[0], size: file.size, caption: caption.data,
        position: mediaOf(t.id).length, url: keep ? await readAsDataUrl(file) : URL.createObjectURL(file), createdAt: iso(), sessionOnly: !keep,
      };
      db.media.push(row);
      save();
      return toMedia(row);
    },
    async updateMedia(tagId, mediaId, input) {
      await delay();
      ownTag(tagId);
      const m = db.media.find((x) => x.id === mediaId && x.tagId === tagId);
      if (!m) fail(404, "not_found", "Media not found");
      const r = mediaCaptionSchema.safeParse(input.caption);
      if (!r.success) validation(r.error);
      m.caption = r.data;
      save();
      return toMedia(m);
    },
    async reorderMedia(tagId, ids) {
      await delay();
      ownTag(tagId);
      const current = mediaOf(tagId);
      if (ids.length !== current.length || !current.every((m) => ids.includes(m.id))) fail(422, "validation", "The list must contain every media item of the tag once");
      ids.forEach((mid, i) => (db.media.find((m) => m.id === mid)!.position = i));
      save();
      return mediaOf(tagId).map(toMedia);
    },
    async deleteMedia(tagId, mediaId) {
      await delay();
      ownTag(tagId);
      const m = db.media.find((x) => x.id === mediaId && x.tagId === tagId);
      if (!m) fail(404, "not_found", "Media not found");
      db.media = db.media.filter((x) => x !== m);
      mediaOf(tagId).forEach((x, i) => (x.position = i));
      save();
    },

    async listReplies(tagId) {
      await delay();
      ownTag(tagId);
      return db.replies
        .filter((r) => r.tagId === tagId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((r): Reply => ({ id: r.id, name: r.name, message: r.message, read: r.read, createdAt: r.createdAt }));
    },
    async markRepliesRead(tagId) {
      await delay();
      ownTag(tagId);
      db.replies.filter((r) => r.tagId === tagId).forEach((r) => (r.read = true));
      save();
    },
    async deleteReply(tagId, replyId) {
      await delay();
      ownTag(tagId);
      if (!db.replies.some((r) => r.id === replyId && r.tagId === tagId)) fail(404, "not_found", "Reply not found");
      db.replies = db.replies.filter((r) => r.id !== replyId);
      save();
    },

    async listMoves() {
      await delay();
      const u = requireUser();
      return db.moves.filter((m) => m.ownerId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(toMove);
    },
    async getMove(moveId): Promise<MoveDetail> {
      await delay();
      const m = ownMove(moveId);
      const boxes = db.tags.filter((t) => t.moveId === m.id).map(toTag);
      return { ...toMove(m), rooms: groupByRoom(boxes) };
    },
    async createMove(input) {
      await delay();
      const u = requireUser();
      const r = moveInputSchema.safeParse(input);
      if (!r.success) validation(r.error);
      const row: MoveRow = { id: id("mv"), ownerId: u.id, ...r.data, lastBoxNumber: 0, createdAt: iso() };
      db.moves.push(row);
      save();
      return toMove(row);
    },
    async updateMove(moveId, input) {
      await delay();
      const m = ownMove(moveId);
      const r = moveInputSchema.safeParse(input);
      if (!r.success) validation(r.error);
      Object.assign(m, r.data);
      save();
      return toMove(m);
    },
    async deleteMove(moveId) {
      await delay();
      const m = ownMove(moveId);
      if (db.tags.some((t) => t.moveId === m.id)) fail(409, "move_not_empty", "Move the boxes to another move or delete them first");
      db.moves = db.moves.filter((x) => x !== m);
      save();
    },
    async searchMove(moveId, q) {
      await delay();
      const m = ownMove(moveId);
      const boxes = db.tags.filter((t) => t.moveId === m.id);
      return searchContents(boxes, q).map((h) => ({ tagId: h.box.id, code: h.box.code, title: h.box.title, boxNumber: h.box.boxNumber, room: h.box.room, matches: h.matches }));
    },

    async getPublicTag(rawCode): Promise<PublicTagView> {
      await delay();
      const code = normalizeCode(rawCode);
      const tag = code ? db.tags.find((t) => t.code === code) ?? null : null;
      const user = currentUser();
      const isOwner = !!tag && !!user && tag.ownerId === user.id;
      const decision = visitorView(tag, { now: now(), unlocked: !!tag && unlockedFor(tag), isOwner });
      switch (decision.state) {
        case "unknown":
        case "archived":
        case "private":
          return { state: decision.state };
        case "timeLocked":
          return { state: "timeLocked", title: tag!.title, recipient: tag!.recipient, theme: tag!.theme, opensAt: tag!.opensAt! };
        case "pinRequired":
          return { state: "pinRequired", theme: tag!.theme, ...attemptState(tag!) };
      }
      const t = tag!;
      if (!decision.preview) {
        const visitorId = getVisitorId();
        if (shouldCountScan(db.scans.filter((x) => x.tagId === t.id), visitorId, now())) {
          db.scans.push({ tagId: t.id, at: iso(), visitorId });
          save();
        }
      }
      return {
        state: "open",
        preview: decision.preview,
        tag: {
          code: t.code, kind: t.kind, title: t.title, recipient: t.recipient, message: t.message, theme: t.theme, allowReplies: t.allowReplies,
          boxNumber: t.boxNumber, room: t.room, contents: [...t.contents], fragile: t.fragile,
          moveName: t.moveId ? db.moves.find((m) => m.id === t.moveId)?.name ?? null : null,
          media: mediaOf(t.id).map((m) => ({ id: m.id, type: m.type, mimeType: m.mimeType, caption: m.caption, url: m.url })),
        },
      };
    },
    async unlockTag(rawCode, pin) {
      await delay();
      const code = normalizeCode(rawCode);
      const tag = code ? db.tags.find((t) => t.code === code) : undefined;
      if (!tag) fail(404, "not_found", "No tag with this code");
      const d = visitorView(tag, { now: now(), unlocked: false, isOwner: false });
      if (d.state !== "pinRequired") fail(409, "not_pin_protected", "This tag does not need a PIN right now");
      const before = attemptState(tag);
      if (before.lockedUntil)
        fail(423, "locked", `Too many attempts. Try again in ${PIN_LOCK_MINUTES} minutes`, { attemptsLeft: 0, lockedUntil: before.lockedUntil });
      if (pin !== tag.pin) {
        db.pinFailures.push({ tagId: tag.id, visitorId: getVisitorId(), at: iso() });
        save();
        const after = attemptState(tag);
        if (after.lockedUntil)
          fail(423, "locked", `Too many attempts. Try again in ${PIN_LOCK_MINUTES} minutes`, { attemptsLeft: 0, lockedUntil: after.lockedUntil });
        fail(403, "wrong_pin", `Wrong PIN. ${after.attemptsLeft} ${after.attemptsLeft === 1 ? "attempt" : "attempts"} left`, after);
      }
      const token = `ul_${id("x")}${Math.random().toString(36).slice(2)}`;
      const expiresAt = new Date(now().getTime() + UNLOCK_HOURS * 3_600_000).toISOString();
      db.unlocks.push({ token, tagId: tag.id, expiresAt });
      db.pinFailures = db.pinFailures.filter((f) => !(f.tagId === tag.id && f.visitorId === getVisitorId()));
      save();
      saveUnlock(tag.code, token, expiresAt);
      return { accessToken: token, expiresAt };
    },
    async postReply(rawCode, input) {
      await delay();
      const code = normalizeCode(rawCode);
      const tag = code ? db.tags.find((t) => t.code === code) : undefined;
      if (!tag) fail(404, "not_found", "No tag with this code");
      const d = visitorView(tag, { now: now(), unlocked: unlockedFor(tag), isOwner: false });
      if (d.state !== "open" || !tag.allowReplies) fail(403, "replies_closed", "Replies are not open for this tag");
      const r = replyInputSchema.safeParse(input);
      if (!r.success) validation(r.error);
      const hourAgo = now().getTime() - 3_600_000;
      if (db.replies.filter((x) => x.tagId === tag.id && Date.parse(x.createdAt) > hourAgo).length >= REPLY_LIMIT_PER_HOUR)
        fail(429, "too_many_replies", "Too many replies right now. Try again later.");
      const row = { id: id("r"), tagId: tag.id, name: r.data.name, message: r.data.message, read: false, createdAt: iso() };
      db.replies.push(row);
      save();
      return { id: row.id, name: row.name, message: row.message, read: false, createdAt: row.createdAt };
    },

    async resetDemo() {
      db = buildSeed(now());
      setToken(null);
      save();
    },
  };

  function startSession(userId: string): Session {
    const token = `s_${id("tok")}${Math.random().toString(36).slice(2)}`;
    db.sessions.push({ token, userId });
    setToken(token);
    save();
    const u = db.users.find((x) => x.id === userId)!;
    return { token, user: { id: u.id, name: u.name, email: u.email, createdAt: u.createdAt } };
  }

  return api;
}

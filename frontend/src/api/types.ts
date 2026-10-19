import type {
  ApiErrorBody,
  Media,
  Move,
  MoveDetail,
  MoveInput,
  MoveSearchHit,
  PublicTagView,
  Reply,
  ReplyInput,
  Session,
  Stats,
  Tag,
  TagInput,
  TagQuery,
  UnlockResult,
  User,
} from "@moveeasy/shared";

export type * from "@moveeasy/shared";

/** Every failing call throws this. `status` follows HTTP (400, 401, 403, 404, 409, 413, 422, 423, 429, 0 = network). */
export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  attemptsLeft?: number;
  lockedUntil?: string | null;
  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.status = status;
    this.code = body.code;
    this.fields = body.fields;
    this.attemptsLeft = body.attemptsLeft;
    this.lockedUntil = body.lockedUntil;
  }
}

export interface UploadOptions {
  caption?: string;
  onProgress?: (fraction: number) => void;
}

/**
 * The services layer. Screens talk to data only through this interface.
 * Two implementations: `mock/` (in the browser) and `http/` (the backend).
 */
export interface Api {
  readonly mode: "mock" | "http";

  // Auth. The session token is kept by the implementation.
  signUp(input: { name: string; email: string; password: string }): Promise<Session>;
  logIn(input: { email: string; password: string }): Promise<Session>;
  logOut(): Promise<void>;
  me(): Promise<User | null>;

  // Tags (owner)
  listTags(query?: TagQuery): Promise<Tag[]>;
  getTag(id: string): Promise<Tag>;
  createTag(input: TagInput): Promise<Tag>;
  updateTag(id: string, input: TagInput): Promise<Tag>;
  setArchived(id: string, archived: boolean): Promise<Tag>;
  deleteTag(id: string): Promise<void>;
  getStats(): Promise<Stats>;

  // Media (owner)
  uploadMedia(tagId: string, file: File | Blob, options?: UploadOptions): Promise<Media>;
  updateMedia(tagId: string, mediaId: string, input: { caption: string }): Promise<Media>;
  reorderMedia(tagId: string, mediaIds: string[]): Promise<Media[]>;
  deleteMedia(tagId: string, mediaId: string): Promise<void>;

  // Replies (owner)
  listReplies(tagId: string): Promise<Reply[]>;
  markRepliesRead(tagId: string): Promise<void>;
  deleteReply(tagId: string, replyId: string): Promise<void>;

  // Moves (owner)
  listMoves(): Promise<Move[]>;
  getMove(id: string): Promise<MoveDetail>;
  createMove(input: MoveInput): Promise<Move>;
  updateMove(id: string, input: MoveInput): Promise<Move>;
  deleteMove(id: string): Promise<void>;
  searchMove(id: string, q: string): Promise<MoveSearchHit[]>;

  // Public page (no account; the owner gets a preview)
  getPublicTag(code: string): Promise<PublicTagView>;
  unlockTag(code: string, pin: string): Promise<UnlockResult>;
  postReply(code: string, input: ReplyInput): Promise<Reply>;

  /** Mock only: restore the seed data. */
  resetDemo?(): Promise<void>;
}

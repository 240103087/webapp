import type { MediaType, Privacy, TagKind, Theme } from "./schemas";
import type { VisitorState } from "./access";

/** Data types shared by the frontend services layer and the backend. Dates are ISO strings (UTC). */

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Session {
  token: string;
  user: User;
}

export interface Media {
  id: string;
  type: MediaType;
  mimeType: string;
  size: number;
  caption: string;
  position: number;
  url: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  code: string;
  kind: TagKind;
  title: string;
  recipient: string | null;
  message: string;
  theme: Theme;
  privacy: Privacy;
  hasPin: boolean;
  opensAt: string | null;
  allowReplies: boolean;
  status: "active" | "archived";
  moveId: string | null;
  moveName: string | null;
  boxNumber: number | null;
  room: string | null;
  contents: string[];
  fragile: boolean;
  scanCount: number;
  lastScanAt: string | null;
  replyCount: number;
  unreadReplies: number;
  coverUrl: string | null;
  media: Media[];
  createdAt: string;
  updatedAt: string;
}

export type TagSort = "newest" | "scans";

export interface TagQuery {
  q?: string;
  kind?: TagKind;
  moveId?: string;
  archived?: boolean;
  sort?: TagSort;
}

export interface Reply {
  id: string;
  name: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Move {
  id: string;
  name: string;
  fromAddress: string | null;
  toAddress: string | null;
  date: string | null;
  boxCount: number;
  createdAt: string;
}

export interface MoveDetail extends Move {
  rooms: { room: string; boxes: Tag[] }[];
}

export interface MoveSearchHit {
  tagId: string;
  code: string;
  title: string;
  boxNumber: number | null;
  room: string | null;
  matches: string[];
}

export interface Stats {
  tags: number;
  scansThisWeek: number;
  unreadReplies: number;
}

export interface PublicMedia {
  id: string;
  type: MediaType;
  mimeType: string;
  caption: string;
  url: string;
}

export interface PublicTag {
  code: string;
  kind: TagKind;
  title: string;
  recipient: string | null;
  message: string;
  theme: Theme;
  allowReplies: boolean;
  boxNumber: number | null;
  room: string | null;
  contents: string[];
  fragile: boolean;
  moveName: string | null;
  media: PublicMedia[];
}

export type PublicTagView =
  | { state: "unknown" }
  | { state: "archived" }
  | { state: "private" }
  | { state: "timeLocked"; title: string; recipient: string | null; theme: Theme; opensAt: string }
  | { state: "pinRequired"; theme: Theme; attemptsLeft: number; lockedUntil: string | null }
  | { state: "open"; preview: boolean; tag: PublicTag };

export type { VisitorState };

export interface UnlockResult {
  accessToken: string;
  expiresAt: string;
}

/** Error shape returned by every failing call. */
export interface ApiErrorBody {
  code: string;
  message: string;
  fields?: Record<string, string>;
  attemptsLeft?: number;
  lockedUntil?: string | null;
}

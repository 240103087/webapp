import type { MediaType, Privacy, TagKind, Theme } from "@moveeasy/shared";

export interface UserRow { id: string; name: string; email: string; password: string; createdAt: string }
export interface MoveRow { id: string; ownerId: string; name: string; fromAddress: string | null; toAddress: string | null; date: string | null; lastBoxNumber: number; createdAt: string }
export interface TagRow {
  id: string; ownerId: string; code: string; kind: TagKind; title: string; recipient: string | null; message: string; theme: Theme;
  privacy: Privacy; pin: string | null; opensAt: string | null; allowReplies: boolean; status: "active" | "archived";
  moveId: string | null; boxNumber: number | null; room: string | null; contents: string[]; fragile: boolean; createdAt: string; updatedAt: string;
}
export interface MediaRow { id: string; tagId: string; type: MediaType; mimeType: string; size: number; caption: string; position: number; url: string; createdAt: string; sessionOnly: boolean }
export interface ReplyRow { id: string; tagId: string; name: string; message: string; read: boolean; createdAt: string }
export interface DB {
  users: UserRow[];
  sessions: { token: string; userId: string }[];
  moves: MoveRow[];
  tags: TagRow[];
  media: MediaRow[];
  replies: ReplyRow[];
  scans: { tagId: string; at: string }[];
  pinFailures: { tagId: string; visitorId: string; at: string }[];
  unlocks: { token: string; tagId: string; expiresAt: string }[];
  seq: number;
}

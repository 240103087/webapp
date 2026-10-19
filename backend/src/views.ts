import type { Media, Tag } from "@moveeasy/shared";
import type { AppDeps } from "./app";
import type { MediaRow, TagRow } from "./store/types";

export function toMedia(deps: AppDeps, m: MediaRow): Media {
  return {
    id: m.id, type: m.type, mimeType: m.mimeType, size: m.size, caption: m.caption, position: m.position,
    url: deps.signer.url(m.id, deps.now()), createdAt: m.createdAt,
  };
}

/** Turns tag rows into API tags, loading media, scans, replies and move names in one batch per kind. */
export async function toTags(deps: AppDeps, rows: TagRow[]): Promise<Tag[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((t) => t.id);
  const [media, scans, replies] = await Promise.all([deps.store.listMedia(ids), deps.store.listScans(ids), deps.store.listReplies(ids)]);
  const moveIds = [...new Set(rows.map((t) => t.moveId).filter((x): x is string => !!x))];
  const moves = new Map((await Promise.all(moveIds.map((id) => deps.store.getMove(id)))).filter((m) => m).map((m) => [m!.id, m!.name]));
  return rows.map((t) => {
    const tagMedia = media.filter((m) => m.tagId === t.id).sort((a, b) => a.position - b.position).map((m) => toMedia(deps, m));
    const tagScans = scans.filter((s) => s.tagId === t.id).map((s) => s.at).sort();
    const tagReplies = replies.filter((r) => r.tagId === t.id);
    return {
      id: t.id, code: t.code, kind: t.kind, title: t.title, recipient: t.recipient, message: t.message, theme: t.theme, privacy: t.privacy,
      hasPin: t.pinHash !== null, opensAt: t.opensAt, allowReplies: t.allowReplies, status: t.status,
      moveId: t.moveId, moveName: t.moveId ? moves.get(t.moveId) ?? null : null,
      boxNumber: t.boxNumber, room: t.room, contents: [...t.contents], fragile: t.fragile,
      scanCount: tagScans.length, lastScanAt: tagScans[tagScans.length - 1] ?? null,
      replyCount: tagReplies.length, unreadReplies: tagReplies.filter((r) => !r.read).length,
      coverUrl: tagMedia.find((m) => m.type === "photo")?.url ?? null,
      media: tagMedia, createdAt: t.createdAt, updatedAt: t.updatedAt,
    };
  });
}

export const toTag = async (deps: AppDeps, row: TagRow) => (await toTags(deps, [row]))[0];

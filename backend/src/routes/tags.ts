import { Router, type Request } from "express";
import { z } from "zod";
import { TAG_KINDS, editEndsUnlocks, generateCode, tagInputSchema } from "@moveeasy/shared";
import type { AppDeps } from "../app";
import { HttpError, notFound } from "../errors";
import { hashSecret } from "../hash";
import { handle, newId, requireUser } from "../http";
import type { TagRow, UserRow } from "../store/types";
import { toTag, toTags } from "../views";

const listQuery = z.object({
  q: z.string().optional(),
  kind: z.enum(TAG_KINDS).optional(),
  moveId: z.string().optional(),
  archived: z.enum(["true", "false", "1", "0"]).optional().transform((v) => v === "true" || v === "1"),
  sort: z.enum(["newest", "scans"]).optional(),
});

/** Loads a tag of the logged-in user; another owner's tag is a 404, never a 403. */
export async function ownTag(deps: AppDeps, req: Request): Promise<{ user: UserRow; tag: TagRow }> {
  const user = await requireUser(deps, req);
  const tag = await deps.store.getTag(req.params.tagId);
  if (!tag || tag.ownerId !== user.id) throw notFound("Tag");
  return { user, tag };
}

export function tagRoutes(deps: AppDeps): Router {
  const r = Router();
  const { store } = deps;

  /** Validates the input and applies the rules the mock applies (`applyTagInput`). */
  async function applyInput(existing: TagRow | null, body: unknown, ownerId: string): Promise<Omit<TagRow, "id" | "code" | "ownerId" | "createdAt">> {
    const v = tagInputSchema.parse(body ?? {});
    const now = deps.now();
    const fields: Record<string, string> = {};
    if (v.opensAt && v.opensAt !== (existing?.opensAt ?? null) && Date.parse(v.opensAt) <= now.getTime()) fields.opensAt = "The open date must be in the future";
    let pinHash = existing?.pinHash ?? null;
    if (v.privacy === "pin") {
      if (v.pin) pinHash = await hashSecret(v.pin);
      else if (!pinHash) fields.pin = "Set a PIN of 4 to 6 digits";
    } else pinHash = null;
    let boxNumber: number | null = null;
    if (v.kind === "box") {
      const move = v.moveId ? await store.getMove(v.moveId) : null;
      if (!move || move.ownerId !== ownerId) fields.moveId = "Choose a move for this box";
      else if (existing?.kind === "box" && existing.moveId === move.id && existing.boxNumber !== null) boxNumber = existing.boxNumber;
      else if (Object.keys(fields).length === 0) boxNumber = await store.nextBoxNumber(move.id);
    }
    if (Object.keys(fields).length) throw new HttpError(422, "validation", Object.values(fields)[0], { fields });
    return {
      kind: v.kind, title: v.title, recipient: v.recipient, message: v.message, theme: v.theme, privacy: v.privacy, pinHash,
      opensAt: v.opensAt ? new Date(v.opensAt).toISOString() : null, allowReplies: v.allowReplies, status: existing?.status ?? "active",
      moveId: v.moveId, boxNumber, room: v.room, contents: v.contents, fragile: v.fragile, updatedAt: now.toISOString(),
    };
  }

  async function uniqueCode(): Promise<string> {
    for (;;) {
      const c = generateCode();
      if (!(await store.getTagByCode(c))) return c;
    }
  }

  r.get("/tags", handle(async (req, res) => {
    const user = await requireUser(deps, req);
    const q = listQuery.parse(req.query);
    const words = q.q?.trim().toLocaleLowerCase();
    let rows = (await store.listTags({ ownerId: user.id })).filter((t) => (q.archived ? t.status === "archived" : t.status === "active"));
    if (words) rows = rows.filter((t) => t.title.toLocaleLowerCase().includes(words));
    if (q.kind) rows = rows.filter((t) => t.kind === q.kind);
    if (q.moveId) rows = rows.filter((t) => t.moveId === q.moveId);
    const tags = await toTags(deps, rows);
    if (q.sort === "scans") tags.sort((a, b) => b.scanCount - a.scanCount || b.createdAt.localeCompare(a.createdAt));
    else tags.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(tags);
  }));

  r.post("/tags", handle(async (req, res) => {
    const user = await requireUser(deps, req);
    const fields = await applyInput(null, req.body, user.id);
    const row: TagRow = { id: newId("t"), ownerId: user.id, code: await uniqueCode(), createdAt: deps.now().toISOString(), ...fields };
    await store.insertTag(row);
    res.status(201).json(await toTag(deps, row));
  }));

  r.get("/tags/:tagId", handle(async (req, res) => {
    const { tag } = await ownTag(deps, req);
    res.json(await toTag(deps, tag));
  }));

  r.put("/tags/:tagId", handle(async (req, res) => {
    const { tag } = await ownTag(deps, req);
    const updated: TagRow = { ...tag, ...(await applyInput(tag, req.body, tag.ownerId)) };
    await store.updateTag(updated);
    if (editEndsUnlocks(tagInputSchema.parse(req.body))) await store.deleteUnlocks(tag.id);
    res.json(await toTag(deps, updated));
  }));

  r.put("/tags/:tagId/archive", handle(async (req, res) => {
    const { tag } = await ownTag(deps, req);
    const { archived } = z.object({ archived: z.boolean({ required_error: "archived is required" }) }).parse(req.body ?? {});
    const updated: TagRow = { ...tag, status: archived ? "archived" : "active", updatedAt: deps.now().toISOString() };
    await store.updateTag(updated);
    res.json(await toTag(deps, updated));
  }));

  r.delete("/tags/:tagId", handle(async (req, res) => {
    const { tag } = await ownTag(deps, req);
    await store.deleteTag(tag.id);
    await deps.files.removeTag(tag.id);
    res.status(204).end();
  }));

  return r;
}

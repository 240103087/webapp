import { Router, type Request } from "express";
import { z } from "zod";
import { groupByRoom, moveInputSchema, searchContents, type Move, type MoveDetail, type MoveSearchHit } from "@moveeasy/shared";
import type { AppDeps } from "../app";
import { HttpError, notFound } from "../errors";
import { handle, newId, requireUser } from "../http";
import type { MoveRow } from "../store/types";
import { toTags } from "../views";

export function moveRoutes(deps: AppDeps): Router {
  const r = Router();
  const { store } = deps;

  async function ownMove(req: Request): Promise<MoveRow> {
    const user = await requireUser(deps, req);
    const m = await store.getMove(req.params.moveId);
    if (!m || m.ownerId !== user.id) throw notFound("Move");
    return m;
  }
  async function toMove(m: MoveRow): Promise<Move> {
    const boxCount = (await store.listTags({ moveId: m.id })).length;
    return { id: m.id, name: m.name, fromAddress: m.fromAddress, toAddress: m.toAddress, date: m.date, boxCount, createdAt: m.createdAt };
  }

  r.get("/moves", handle(async (req, res) => {
    const user = await requireUser(deps, req);
    const moves = (await store.listMoves(user.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(await Promise.all(moves.map(toMove)));
  }));

  r.post("/moves", handle(async (req, res) => {
    const user = await requireUser(deps, req);
    const input = moveInputSchema.parse(req.body ?? {});
    const row: MoveRow = { id: newId("mv"), ownerId: user.id, ...input, lastBoxNumber: 0, createdAt: deps.now().toISOString() };
    await store.insertMove(row);
    res.status(201).json(await toMove(row));
  }));

  r.get("/moves/:moveId", handle(async (req, res) => {
    const m = await ownMove(req);
    const boxes = await toTags(deps, await store.listTags({ moveId: m.id }));
    const detail: MoveDetail = { ...(await toMove(m)), rooms: groupByRoom(boxes) };
    res.json(detail);
  }));

  r.put("/moves/:moveId", handle(async (req, res) => {
    const m = await ownMove(req);
    const updated: MoveRow = { ...m, ...moveInputSchema.parse(req.body ?? {}) };
    await store.updateMove(updated);
    res.json(await toMove(updated));
  }));

  r.delete("/moves/:moveId", handle(async (req, res) => {
    const m = await ownMove(req);
    if ((await store.listTags({ moveId: m.id })).length > 0) throw new HttpError(409, "move_not_empty", "Move the boxes to another move or delete them first");
    await store.deleteMove(m.id);
    res.status(204).end();
  }));

  r.get("/moves/:moveId/search", handle(async (req, res) => {
    const m = await ownMove(req);
    const { q } = z.object({ q: z.string().max(80, "Search must be at most 80 characters").default("") }).parse(req.query);
    const hits: MoveSearchHit[] = searchContents(await store.listTags({ moveId: m.id }), q).map((h) => ({
      tagId: h.box.id, code: h.box.code, title: h.box.title, boxNumber: h.box.boxNumber, room: h.box.room, matches: h.matches,
    }));
    res.json(hits);
  }));

  return r;
}

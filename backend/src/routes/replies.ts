import { Router } from "express";
import { replyInputSchema, type Reply } from "@moveeasy/shared";
import type { AppDeps } from "../app";
import { HttpError, notFound } from "../errors";
import { handle, newId } from "../http";
import type { ReplyRow } from "../store/types";
import { publicAccess } from "./public";
import { ownTag } from "./tags";

export const REPLY_LIMIT_PER_HOUR = 10;
const toReply = (r: ReplyRow): Reply => ({ id: r.id, name: r.name, message: r.message, read: r.read, createdAt: r.createdAt });

export function replyRoutes(deps: AppDeps): Router {
  const r = Router();
  const { store } = deps;
  const access = publicAccess(deps);

  // Visitor
  r.post("/public/tags/:code/replies", handle(async (req, res) => {
    const tag = await access.findTag(req);
    if (!tag) throw notFound("Tag");
    const d = await access.decide(req, tag, { ownerCounts: false });
    if (d.state !== "open" || !tag.allowReplies) throw new HttpError(403, "replies_closed", "Replies are not open for this tag");
    const input = replyInputSchema.parse(req.body ?? {});
    const hourAgo = deps.now().getTime() - 3_600_000;
    const recent = (await store.listReplies([tag.id])).filter((x) => Date.parse(x.createdAt) > hourAgo);
    if (recent.length >= REPLY_LIMIT_PER_HOUR) throw new HttpError(429, "too_many_replies", "Too many replies right now. Try again later.");
    const row: ReplyRow = { id: newId("r"), tagId: tag.id, name: input.name, message: input.message, read: false, createdAt: deps.now().toISOString() };
    await store.insertReply(row);
    res.status(201).json(toReply(row));
  }));

  // Owner
  r.get("/tags/:tagId/replies", handle(async (req, res) => {
    const { tag } = await ownTag(deps, req);
    res.json((await store.listReplies([tag.id])).map(toReply));
  }));

  r.post("/tags/:tagId/replies/read", handle(async (req, res) => {
    const { tag } = await ownTag(deps, req);
    await store.markRepliesRead(tag.id);
    res.status(204).end();
  }));

  r.delete("/tags/:tagId/replies/:replyId", handle(async (req, res) => {
    const { tag } = await ownTag(deps, req);
    const reply = await store.getReply(req.params.replyId);
    if (!reply || reply.tagId !== tag.id) throw notFound("Reply");
    await store.deleteReply(reply.id);
    res.status(204).end();
  }));

  return r;
}

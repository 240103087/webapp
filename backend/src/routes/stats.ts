import { Router } from "express";
import type { Stats } from "@moveeasy/shared";
import type { AppDeps } from "../app";
import { handle, requireUser } from "../http";

export function statsRoutes(deps: AppDeps): Router {
  const r = Router();
  const { store } = deps;
  r.get("/stats", handle(async (req, res) => {
    const user = await requireUser(deps, req);
    const mine = await store.listTags({ ownerId: user.id });
    const ids = mine.map((t) => t.id);
    const weekAgo = deps.now().getTime() - 7 * 86_400_000;
    const [scans, replies] = await Promise.all([store.listScans(ids), store.listReplies(ids)]);
    const stats: Stats = {
      tags: mine.filter((t) => t.status === "active").length,
      scansThisWeek: scans.filter((s) => Date.parse(s.at) > weekAgo).length,
      unreadReplies: replies.filter((r) => !r.read).length,
    };
    res.json(stats);
  }));

  return r;
}

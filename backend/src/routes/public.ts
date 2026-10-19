import { Router, type Request } from "express";
import { z } from "zod";
import {
  PIN_LOCK_MINUTES, UNLOCK_HOURS, normalizeCode, pinAttemptState, pinSchema, shouldCountScan, visitorView,
  type PublicTagView,
} from "@moveeasy/shared";
import type { AppDeps } from "../app";
import { HttpError, notFound } from "../errors";
import { checkSecret } from "../hash";
import { currentUser, handle, newId, newToken, visitorId } from "../http";
import type { TagRow } from "../store/types";

/** Shared by the public view, unlocking and replies (#29). */
export function publicAccess(deps: AppDeps) {
  const { store } = deps;

  async function findTag(req: Request): Promise<TagRow | null> {
    const code = normalizeCode(req.params.code ?? "");
    return code ? store.getTagByCode(code) : null;
  }

  async function isUnlocked(req: Request, tag: TagRow): Promise<boolean> {
    const token = req.get("x-unlock-token");
    if (!token) return false;
    const u = await store.getUnlock(token);
    return !!u && u.tagId === tag.id && Date.parse(u.expiresAt) > deps.now().getTime();
  }

  async function attempts(req: Request, tag: TagRow) {
    const failures = await store.listPinFailures(tag.id, visitorId(req));
    return pinAttemptState(failures.map((f) => f.at), deps.now());
  }

  /** The shared access rules for this request: who is asking, and is the tag open to them. */
  async function decide(req: Request, tag: TagRow | null, opts: { ownerCounts: boolean }) {
    const user = opts.ownerCounts ? await currentUser(deps, req) : null;
    const isOwner = !!tag && !!user && tag.ownerId === user.id;
    const unlocked = !!tag && (await isUnlocked(req, tag));
    return visitorView(tag, { now: deps.now(), unlocked, isOwner });
  }

  return { findTag, attempts, decide };
}

export function publicRoutes(deps: AppDeps): Router {
  const r = Router();
  const { store } = deps;
  const access = publicAccess(deps);

  r.get("/public/tags/:code", handle(async (req, res) => {
    const tag = await access.findTag(req);
    const d = await access.decide(req, tag, { ownerCounts: true });
    let view: PublicTagView;
    switch (d.state) {
      case "unknown":
      case "archived":
      case "private":
        view = { state: d.state };
        break;
      case "timeLocked":
        // Only the cover: the message and media are not sent before the open date.
        view = { state: "timeLocked", title: tag!.title, recipient: tag!.recipient, theme: tag!.theme, opensAt: tag!.opensAt! };
        break;
      case "pinRequired":
        view = { state: "pinRequired", theme: tag!.theme, ...(await access.attempts(req, tag!)) };
        break;
      case "open": {
        const t = tag!;
        if (!d.preview) {
          const visitor = visitorId(req);
          if (shouldCountScan(await store.listScans([t.id]), visitor, deps.now()))
            await store.insertScan({ id: newId("s"), tagId: t.id, visitorId: visitor, at: deps.now().toISOString() });
        }
        const move = t.moveId ? await store.getMove(t.moveId) : null;
        const media = await store.listMedia([t.id]);
        view = {
          state: "open",
          preview: d.preview,
          tag: {
            code: t.code, kind: t.kind, title: t.title, recipient: t.recipient, message: t.message, theme: t.theme, allowReplies: t.allowReplies,
            boxNumber: t.boxNumber, room: t.room, contents: [...t.contents], fragile: t.fragile, moveName: move?.name ?? null,
            media: media.map((m) => ({ id: m.id, type: m.type, mimeType: m.mimeType, caption: m.caption, url: deps.signer.url(m.id, deps.now()) })),
          },
        };
      }
    }
    res.setHeader("Cache-Control", "no-store");
    res.json(view);
  }));

  r.post("/public/tags/:code/unlock", handle(async (req, res) => {
    const tag = await access.findTag(req);
    if (!tag) throw notFound("Tag");
    const { pin } = z.object({ pin: pinSchema }).parse(req.body ?? {});
    const d = await access.decide(req, tag, { ownerCounts: false });
    if (d.state !== "pinRequired") throw new HttpError(409, "not_pin_protected", "This tag does not need a PIN right now");
    const lockMessage = `Too many attempts. Try again in ${PIN_LOCK_MINUTES} minutes`;
    const before = await access.attempts(req, tag);
    if (before.lockedUntil) throw new HttpError(423, "locked", lockMessage, { attemptsLeft: 0, lockedUntil: before.lockedUntil });
    const visitor = visitorId(req);
    if (!tag.pinHash || !(await checkSecret(pin, tag.pinHash))) {
      await store.insertPinFailure({ id: newId("pf"), tagId: tag.id, visitorId: visitor, at: deps.now().toISOString() });
      const after = await access.attempts(req, tag);
      if (after.lockedUntil) throw new HttpError(423, "locked", lockMessage, { attemptsLeft: 0, lockedUntil: after.lockedUntil });
      throw new HttpError(403, "wrong_pin", `Wrong PIN. ${after.attemptsLeft} ${after.attemptsLeft === 1 ? "attempt" : "attempts"} left`, after);
    }
    await store.clearPinFailures(tag.id, visitor);
    const accessToken = newToken();
    const expiresAt = new Date(deps.now().getTime() + UNLOCK_HOURS * 3_600_000).toISOString();
    await store.insertUnlock({ token: accessToken, tagId: tag.id, expiresAt });
    res.json({ accessToken, expiresAt });
  }));

  return r;
}

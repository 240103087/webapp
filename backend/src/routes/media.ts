import { mkdirSync } from "node:fs";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { Router, type RequestHandler } from "express";
import multer from "multer";
import { z } from "zod";
import { MAX_MEDIA_PER_TAG, MEDIA_LIMITS, baseMime, checkMediaFile, mediaCaptionSchema } from "@moveeasy/shared";
import type { AppDeps } from "../app";
import { HttpError, notFound } from "../errors";
import { EXT_BY_MIME } from "../files";
import { handle, newId } from "../http";
import type { MediaRow } from "../store/types";
import { toMedia } from "../views";
import { ownTag } from "./tags";

const MAX_BYTES = Math.max(...Object.values(MEDIA_LIMITS).map((l) => l.maxBytes));

export function mediaRoutes(deps: AppDeps): Router {
  const r = Router();
  const { store, files } = deps;
  const tmp = path.join(files.root, ".incoming");
  mkdirSync(tmp, { recursive: true });
  // Cast: @types/multer is typed against Express 5 types, the app uses Express 4.
  const upload = multer({ dest: tmp, limits: { fileSize: MAX_BYTES, files: 1, fields: 5 } }).single("file") as unknown as RequestHandler;

  const reposition = async (tagId: string) => {
    const list = await store.listMedia([tagId]);
    for (const [i, m] of list.entries()) if (m.position !== i) await store.updateMedia({ ...m, position: i });
    return list.map((m, i) => ({ ...m, position: i }));
  };

  r.post("/tags/:tagId/media", handle(async (req, res) => {
    const { tag } = await ownTag(deps, req);
    // Parse the multipart body only after the owner check, so strangers cannot fill the disk.
    await new Promise<void>((resolve, reject) =>
      upload(req, res, (err?: unknown) => {
        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") reject(new HttpError(413, "too_big", "Too big. Videos up to 50 MB"));
        else if (err) reject(err instanceof multer.MulterError ? new HttpError(422, "validation", err.message) : err);
        else resolve();
      }),
    );
    const file = req.file;
    try {
      if (!file) throw new HttpError(422, "validation", "Choose a file", { fields: { file: "Choose a file" } });
      const mime = baseMime(file.mimetype);
      const check = checkMediaFile(mime, file.size);
      if (!check.ok) throw check.error.startsWith("Too big") ? new HttpError(413, "too_big", check.error) : new HttpError(422, "bad_file", check.error);
      const caption = mediaCaptionSchema.parse(req.body?.caption ?? "");
      const existing = await store.listMedia([tag.id]);
      if (existing.length >= MAX_MEDIA_PER_TAG) throw new HttpError(409, "too_many_media", `A tag can have at most ${MAX_MEDIA_PER_TAG} media files`);
      const id = newId("m");
      const rel = await files.put(tag.id, id, EXT_BY_MIME[mime] ?? "", file.path);
      const row: MediaRow = { id, tagId: tag.id, type: check.type, mimeType: mime, size: file.size, caption, position: existing.length, file: rel, createdAt: deps.now().toISOString() };
      await store.insertMedia(row);
      res.status(201).json(toMedia(deps, row));
    } finally {
      if (file) await unlink(file.path).catch(() => {});
    }
  }));

  r.put("/tags/:tagId/media/order", handle(async (req, res) => {
    const { tag } = await ownTag(deps, req);
    const { mediaIds } = z.object({ mediaIds: z.array(z.string()) }).parse(req.body ?? {});
    const current = await store.listMedia([tag.id]);
    if (mediaIds.length !== current.length || new Set(mediaIds).size !== mediaIds.length || !current.every((m) => mediaIds.includes(m.id)))
      throw new HttpError(422, "validation", "The list must contain every media item of the tag once", { fields: { mediaIds: "The list must contain every media item of the tag once" } });
    for (const m of current) await store.updateMedia({ ...m, position: mediaIds.indexOf(m.id) });
    res.json((await store.listMedia([tag.id])).map((m) => toMedia(deps, m)));
  }));

  r.patch("/tags/:tagId/media/:mediaId", handle(async (req, res) => {
    const { tag } = await ownTag(deps, req);
    const m = await store.getMedia(req.params.mediaId);
    if (!m || m.tagId !== tag.id) throw notFound("Media");
    const { caption } = z.object({ caption: mediaCaptionSchema }).parse(req.body ?? {});
    const updated = { ...m, caption };
    await store.updateMedia(updated);
    res.json(toMedia(deps, updated));
  }));

  r.delete("/tags/:tagId/media/:mediaId", handle(async (req, res) => {
    const { tag } = await ownTag(deps, req);
    const m = await store.getMedia(req.params.mediaId);
    if (!m || m.tagId !== tag.id) throw notFound("Media");
    await store.deleteMedia(m.id);
    await files.remove(m.file);
    await reposition(tag.id);
    res.status(204).end();
  }));

  /** The file itself. No bearer token: the signed URL is the permission. */
  r.get("/media/:mediaId/file", handle(async (req, res) => {
    const m = await store.getMedia(req.params.mediaId);
    if (!deps.signer.check(req.params.mediaId, req.query.exp as string | undefined, req.query.sig as string | undefined, deps.now()))
      throw new HttpError(403, "bad_signature", "This link has expired. Reload the page");
    if (!m) throw notFound("Media");
    res.setHeader("Content-Type", m.mimeType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    await new Promise<void>((resolve, reject) =>
      res.sendFile(files.abs(m.file), { acceptRanges: true, lastModified: true, headers: { "Content-Type": m.mimeType } }, (err) => (err && !res.headersSent ? reject(notFound("File")) : resolve())),
    );
  }));

  return r;
}

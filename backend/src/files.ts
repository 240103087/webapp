import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { copyFile, rename, rm, unlink } from "node:fs/promises";
import path from "node:path";

/** Media files on disk under `UPLOAD_DIR/<tagId>/<mediaId>.<ext>`. The database keeps only the relative path. */
export class FileStore {
  constructor(readonly root: string) {
    mkdirSync(root, { recursive: true });
  }
  abs(rel: string): string {
    const p = path.resolve(this.root, rel);
    if (!p.startsWith(this.root + path.sep)) throw new Error("Path outside the upload folder");
    return p;
  }
  /** Moves (or copies) a file into the store and returns its relative path. */
  async put(tagId: string, mediaId: string, ext: string, src: string, mode: "move" | "copy" = "move"): Promise<string> {
    const rel = path.join(tagId, `${mediaId}${ext}`);
    mkdirSync(path.join(this.root, tagId), { recursive: true });
    if (mode === "copy") await copyFile(src, this.abs(rel));
    else {
      try {
        await rename(src, this.abs(rel));
      } catch {
        await copyFile(src, this.abs(rel));
        await unlink(src).catch(() => {});
      }
    }
    return rel;
  }
  async remove(rel: string) {
    await unlink(this.abs(rel)).catch(() => {});
  }
  async removeTag(tagId: string) {
    await rm(path.join(this.root, tagId), { recursive: true, force: true });
  }
}

/** Signed, expiring media URLs, so `<img>` and `<video>` load files without a bearer token. */
export class UrlSigner {
  constructor(private secret: string, private ttlSeconds = 24 * 3600) {}
  private sig(mediaId: string, exp: number) {
    return createHmac("sha256", this.secret).update(`${mediaId}.${exp}`).digest("base64url");
  }
  url(mediaId: string, now: Date): string {
    // Round the expiry to the hour so URLs stay the same between requests and the browser can cache them.
    const exp = Math.ceil(now.getTime() / 3_600_000) * 3600 + this.ttlSeconds;
    return `/api/media/${encodeURIComponent(mediaId)}/file?exp=${exp}&sig=${this.sig(mediaId, exp)}`;
  }
  check(mediaId: string, exp: string | undefined, sig: string | undefined, now: Date): boolean {
    const e = Number(exp);
    if (!Number.isInteger(e) || !sig || e * 1000 < now.getTime()) return false;
    const want = Buffer.from(this.sig(mediaId, e));
    const got = Buffer.from(sig);
    return want.length === got.length && timingSafeEqual(want, got);
  }
}

export const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
  "video/mp4": ".mp4", "video/webm": ".webm",
  "audio/mpeg": ".mp3", "audio/mp4": ".m4a", "audio/x-m4a": ".m4a", "audio/webm": ".weba", "audio/ogg": ".ogg", "audio/wav": ".wav", "audio/x-wav": ".wav",
};

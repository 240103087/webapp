import { randomBytes } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { User } from "@moveeasy/shared";
import type { AppDeps } from "./app";
import { HttpError } from "./errors";
import type { UserRow } from "./store/types";

/** Wraps an async route so a rejected promise reaches the error handler. */
export const handle =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

/** Short random id with a type prefix, for example `t_Xb3k...`. */
export const newId = (prefix: string) => `${prefix}_${randomBytes(9).toString("base64url")}`;
/** Unguessable token for sessions and PIN unlocks. */
export const newToken = () => randomBytes(32).toString("base64url");

export function bearer(req: Request): string | null {
  const h = req.get("authorization");
  const m = h && /^Bearer\s+(\S+)$/i.exec(h);
  return m ? m[1] : null;
}

export async function currentUser(deps: AppDeps, req: Request): Promise<UserRow | null> {
  const token = bearer(req);
  if (!token) return null;
  const session = await deps.store.getSession(token);
  return session ? deps.store.getUser(session.userId) : null;
}

export async function requireUser(deps: AppDeps, req: Request): Promise<UserRow> {
  const u = await currentUser(deps, req);
  if (!u) throw new HttpError(401, "unauthorized", "Please log in");
  return u;
}

export const toUser = (u: UserRow): User => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt });

/** The visitor id the browser sends, or a stand-in so limits still apply per network address. */
export function visitorId(req: Request): string {
  const v = req.get("x-visitor-id")?.trim();
  return v && v.length <= 64 ? v : `ip:${req.ip}`;
}

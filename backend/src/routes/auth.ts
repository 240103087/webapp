import { Router } from "express";
import { logInSchema, signUpSchema, type Session } from "@moveeasy/shared";
import type { AppDeps } from "../app";
import { HttpError } from "../errors";
import { checkSecret, hashSecret } from "../hash";
import { bearer, handle, newId, newToken, requireUser, toUser } from "../http";
import type { UserRow } from "../store/types";

export function authRoutes(deps: AppDeps): Router {
  const r = Router();
  const { store } = deps;

  async function startSession(u: UserRow): Promise<Session> {
    const token = newToken();
    await store.insertSession({ token, userId: u.id, createdAt: deps.now().toISOString() });
    return { token, user: toUser(u) };
  }

  r.post("/auth/signup", handle(async (req, res) => {
    const input = signUpSchema.parse(req.body ?? {});
    if (await store.getUserByEmail(input.email)) {
      const message = "An account with this email already exists";
      throw new HttpError(409, "email_taken", message, { fields: { email: message } });
    }
    const user: UserRow = { id: newId("u"), name: input.name, email: input.email, passwordHash: await hashSecret(input.password), createdAt: deps.now().toISOString() };
    await store.insertUser(user);
    res.status(201).json(await startSession(user));
  }));

  r.post("/auth/login", handle(async (req, res) => {
    const input = logInSchema.parse(req.body ?? {});
    const user = await store.getUserByEmail(input.email);
    // Same answer for an unknown email and a wrong password, so emails cannot be probed.
    if (!user || !(await checkSecret(input.password, user.passwordHash))) throw new HttpError(401, "bad_credentials", "Email or password is wrong");
    res.json(await startSession(user));
  }));

  r.post("/auth/logout", handle(async (req, res) => {
    await requireUser(deps, req);
    await store.deleteSession(bearer(req)!);
    res.status(204).end();
  }));

  r.get("/auth/me", handle(async (req, res) => {
    res.json(toUser(await requireUser(deps, req)));
  }));

  return r;
}

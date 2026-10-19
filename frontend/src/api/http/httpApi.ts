import type { ApiErrorBody, Media, PublicTagView, Session, TagQuery, User } from "@moveeasy/shared";
import { ApiError, type Api, type UploadOptions } from "../types";
import { getToken, getUnlock, getVisitorId, saveUnlock, setToken } from "../clientState";

export interface HttpOptions {
  /** Prefix for every path; "" means the same origin (Vite proxies `/api` in development). */
  baseUrl?: string;
  fetch?: typeof fetch;
}

/** The services interface over HTTP, following `openapi.yaml` (#36). Each method is the operation with the same id. */
export function createHttpApi(opts: HttpOptions = {}): Api {
  const base = opts.baseUrl ?? "";
  const f = opts.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));

  function headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = { Accept: "application/json", "X-Visitor-Id": getVisitorId(), ...extra };
    const token = getToken();
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  async function toError(res: Response): Promise<ApiError> {
    let body: Partial<ApiErrorBody> = {};
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      /* not JSON, for example a proxy error page */
    }
    const message = body.message ?? (res.status >= 500 ? "The server had a problem. Try again in a moment." : `Request failed (${res.status})`);
    return new ApiError(res.status, { code: body.code ?? (res.status >= 500 ? "server_error" : "error"), message, fields: body.fields, attemptsLeft: body.attemptsLeft, lockedUntil: body.lockedUntil });
  }

  async function call<T>(method: string, path: string, body?: unknown, extra: Record<string, string> = {}): Promise<T> {
    let res: Response;
    try {
      res = await f(base + path, {
        method,
        headers: headers(body === undefined ? extra : { "Content-Type": "application/json", ...extra }),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, { code: "network", message: "No connection to the server. Check your internet and try again." });
    }
    if (!res.ok) {
      const err = await toError(res);
      notifyUnauthorized(err, path);
      throw err;
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  /** Owner calls answered 401 mean the session is gone; the app listens for this event (#37). */
  function notifyUnauthorized(err: ApiError, path: string) {
    if (err.status === 401 && err.code === "unauthorized" && !path.startsWith("/api/auth/")) {
      setToken(null);
      window.dispatchEvent(new CustomEvent("moveeasy:unauthorized"));
    }
  }

  const enc = encodeURIComponent;
  const unlockHeader = (code: string): Record<string, string> => {
    const t = getUnlock(code.toUpperCase().replace(/\s+/g, ""));
    return t ? { "X-Unlock-Token": t } : {};
  };

  function upload(tagId: string, file: File | Blob, options: UploadOptions): Promise<Media> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${base}/api/tags/${enc(tagId)}/media`);
      for (const [k, v] of Object.entries(headers())) xhr.setRequestHeader(k, v);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) options.onProgress?.(e.loaded / e.total);
      };
      xhr.onload = () => {
        let body: unknown = null;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          /* empty */
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          options.onProgress?.(1);
          resolve(body as Media);
        } else {
          const b = (body ?? {}) as Partial<ApiErrorBody>;
          const err = new ApiError(xhr.status, { code: b.code ?? "error", message: b.message ?? `Upload failed (${xhr.status})`, fields: b.fields });
          notifyUnauthorized(err, "/api/tags");
          reject(err);
        }
      };
      xhr.onerror = () => reject(new ApiError(0, { code: "network", message: "Upload failed. Check your connection." }));
      const form = new FormData();
      const name = file instanceof File ? file.name : `voice-${Date.now()}.webm`;
      form.append("file", file, name);
      if (options.caption) form.append("caption", options.caption);
      xhr.send(form);
    });
  }

  return {
    mode: "http",

    async signUp(input) {
      const s = await call<Session>("POST", "/api/auth/signup", input);
      setToken(s.token);
      return s;
    },
    async logIn(input) {
      const s = await call<Session>("POST", "/api/auth/login", input);
      setToken(s.token);
      return s;
    },
    async logOut() {
      try {
        if (getToken()) await call<void>("POST", "/api/auth/logout");
      } finally {
        setToken(null);
      }
    },
    async me() {
      if (!getToken()) return null;
      try {
        return await call<User>("GET", "/api/auth/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          setToken(null);
          return null;
        }
        throw e;
      }
    },

    listTags(query: TagQuery = {}) {
      const p = new URLSearchParams();
      if (query.q) p.set("q", query.q);
      if (query.kind) p.set("kind", query.kind);
      if (query.moveId) p.set("moveId", query.moveId);
      if (query.archived) p.set("archived", "true");
      if (query.sort) p.set("sort", query.sort);
      const qs = p.toString();
      return call("GET", `/api/tags${qs ? `?${qs}` : ""}`);
    },
    getTag: (id) => call("GET", `/api/tags/${enc(id)}`),
    createTag: (input) => call("POST", "/api/tags", input),
    updateTag: (id, input) => call("PUT", `/api/tags/${enc(id)}`, input),
    setArchived: (id, archived) => call("PUT", `/api/tags/${enc(id)}/archive`, { archived }),
    deleteTag: (id) => call("DELETE", `/api/tags/${enc(id)}`),
    getStats: () => call("GET", "/api/stats"),

    uploadMedia: (tagId, file, options = {}) => upload(tagId, file, options),
    updateMedia: (tagId, mediaId, input) => call("PATCH", `/api/tags/${enc(tagId)}/media/${enc(mediaId)}`, input),
    reorderMedia: (tagId, mediaIds) => call("PUT", `/api/tags/${enc(tagId)}/media/order`, { mediaIds }),
    deleteMedia: (tagId, mediaId) => call("DELETE", `/api/tags/${enc(tagId)}/media/${enc(mediaId)}`),

    listReplies: (tagId) => call("GET", `/api/tags/${enc(tagId)}/replies`),
    markRepliesRead: (tagId) => call("POST", `/api/tags/${enc(tagId)}/replies/read`),
    deleteReply: (tagId, replyId) => call("DELETE", `/api/tags/${enc(tagId)}/replies/${enc(replyId)}`),

    listMoves: () => call("GET", "/api/moves"),
    getMove: (id) => call("GET", `/api/moves/${enc(id)}`),
    createMove: (input) => call("POST", "/api/moves", input),
    updateMove: (id, input) => call("PUT", `/api/moves/${enc(id)}`, input),
    deleteMove: (id) => call("DELETE", `/api/moves/${enc(id)}`),
    searchMove: (id, q) => call("GET", `/api/moves/${enc(id)}/search?q=${enc(q)}`),

    getPublicTag: (code) => call<PublicTagView>("GET", `/api/public/tags/${enc(code)}`, undefined, unlockHeader(code)),
    async unlockTag(code, pin) {
      const r = await call<{ accessToken: string; expiresAt: string }>("POST", `/api/public/tags/${enc(code)}/unlock`, { pin });
      saveUnlock(code.toUpperCase().replace(/\s+/g, ""), r.accessToken, r.expiresAt);
      return r;
    },
    postReply: (code, input) => call("POST", `/api/public/tags/${enc(code)}/replies`, input, unlockHeader(code)),
  };
}

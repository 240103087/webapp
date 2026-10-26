/** Client-side state shared by both service implementations: the session token, the visitor id and PIN unlocks. */
const TOKEN_KEY = "moveeasy.token";
const VISITOR_KEY = "moveeasy.visitor";
const UNLOCKS_KEY = "moveeasy.unlocks";

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* storage blocked: the app still works for this page view */ }
}

export const getToken = () => read(TOKEN_KEY);
export const setToken = (t: string | null) => write(TOKEN_KEY, t);

export function getVisitorId(): string {
  let id = read(VISITOR_KEY);
  if (!id) {
    id = `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    write(VISITOR_KEY, id);
  }
  return id;
}

type Unlocks = Record<string, { token: string; expiresAt: string }>;
function unlocks(): Unlocks {
  try { return JSON.parse(read(UNLOCKS_KEY) ?? "{}") as Unlocks; } catch { return {}; }
}
/** `now` lets the mock pass its own clock, so tests do not depend on the real date. */
export function getUnlock(code: string, now = Date.now()): string | null {
  const u = unlocks()[code];
  if (!u || Date.parse(u.expiresAt) <= now) return null;
  return u.token;
}
export function saveUnlock(code: string, token: string, expiresAt: string, now = Date.now()) {
  const all = unlocks();
  for (const [k, v] of Object.entries(all)) if (Date.parse(v.expiresAt) <= now) delete all[k];
  all[code] = { token, expiresAt };
  write(UNLOCKS_KEY, JSON.stringify(all));
}

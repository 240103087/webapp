import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, SESSION_EXPIRED_EVENT } from "../api";
import type { User } from "../api/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  /** True after the server ended the session, until the next login. */
  sessionExpired: boolean;
  logIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .me()
      .then((u) => alive && setUser(u))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // The HTTP client fires this when an owner call gets 401: the session expired or was revoked.
  // Dropping the user lets RequireAuth send them to /login?next=<this page> (#37).
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setSessionExpired(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const logIn = useCallback(async (email: string, password: string) => {
    const s = await api.logIn({ email, password });
    setSessionExpired(false);
    setUser(s.user);
  }, []);
  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const s = await api.signUp({ name, email, password });
    setSessionExpired(false);
    setUser(s.user);
  }, []);
  const logOut = useCallback(async () => {
    await api.logOut();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, sessionExpired, logIn, signUp, logOut, setUser }), [user, loading, sessionExpired, logIn, signUp, logOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}

/** Only same-site paths are allowed as a return target. */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "./AuthContext";
import { IconUser } from "../ui/icons";
import { useToast } from "../ui/Toast";

export function UserMenu() {
  const { user, logOut } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!user) return null;
  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="btn btn-ghost" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        <IconUser size={18} />
        {user.name.split(" ")[0]}
      </button>
      {open && (
        <div className="user-menu-list">
          <div className="who">
            <strong>{user.name}</strong>
            <div className="muted">{user.email}</div>
          </div>
          {api.resetDemo && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={async () => {
                await api.resetDemo!();
                await logOut();
                toast.show("Demo data restored");
                nav("/login");
              }}
            >
              Reset demo data
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => {
              await logOut();
              nav("/login");
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

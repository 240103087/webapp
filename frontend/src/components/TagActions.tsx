import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import type { Tag } from "../api/types";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { IconArchive, IconMenu, IconTrash } from "../ui/icons";
import { useToast } from "../ui/Toast";

type Target = Pick<Tag, "id" | "title" | "status">;

/** Archive, unarchive and delete with a confirm dialog. Shared by the tag page and the card menu. */
function useTagActions(tag: Target, onChanged: (t: Tag | null) => void) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const archived = tag.status === "archived";

  async function toggleArchive() {
    setBusy(true);
    try {
      const t = await api.setArchived(tag.id, !archived);
      toast.show(archived ? `“${tag.title}” is active again` : `“${tag.title}” archived. Its QR page now says it is no longer active.`);
      onChanged(t);
    } catch (e) {
      toast.show((e as ApiError).message || "Could not change the tag", { kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.deleteTag(tag.id);
      setConfirming(false);
      toast.show(`“${tag.title}” deleted`);
      onChanged(null);
    } catch (e) {
      toast.show((e as ApiError).message || "Could not delete the tag", { kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  const dialog = (
    <ConfirmDialog
      open={confirming}
      title={`Delete “${tag.title}”?`}
      confirmLabel="Delete"
      danger
      busy={busy}
      onConfirm={remove}
      onCancel={() => setConfirming(false)}
    >
      <p>Its photos, videos, voice messages and replies are deleted too. Printed QR codes will stop working.</p>
    </ConfirmDialog>
  );
  return { archived, busy, toggleArchive, askDelete: () => setConfirming(true), dialog };
}

/** Buttons on the tag page. After a delete it goes back to the dashboard. */
export function TagActions({ tag, onChange }: { tag: Target; onChange: (t: Tag) => void }) {
  const navigate = useNavigate();
  const a = useTagActions(tag, (t) => (t ? onChange(t) : navigate("/", { replace: true })));
  return (
    <>
      <Button onClick={a.toggleArchive} disabled={a.busy} icon={<IconArchive size={18} />}>
        {a.archived ? "Unarchive" : "Archive"}
      </Button>
      <Button variant="danger" onClick={a.askDelete} disabled={a.busy} icon={<IconTrash size={18} />}>
        Delete
      </Button>
      {a.dialog}
    </>
  );
}

/** The "More" menu in the corner of a dashboard card. */
export function TagCardMenu({ tag, onChanged }: { tag: Target; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const a = useTagActions(tag, onChanged);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="card-menu" ref={ref}>
      <button
        type="button"
        className="card-menu-btn"
        aria-label={`More actions for ${tag.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <IconMenu size={18} />
      </button>
      {open && (
        <div className="card-menu-list" role="menu">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); a.toggleArchive(); }}>
            <IconArchive size={16} /> {a.archived ? "Unarchive" : "Archive"}
          </button>
          <button type="button" role="menuitem" className="danger" onClick={() => { setOpen(false); a.askDelete(); }}>
            <IconTrash size={16} /> Delete
          </button>
        </div>
      )}
      {a.dialog}
    </div>
  );
}

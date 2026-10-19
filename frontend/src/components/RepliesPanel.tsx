import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import type { Reply } from "../api/types";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useToast } from "../ui/Toast";
import { formatDateTime } from "../ui/Badge";
import { IconTrash } from "../ui/icons";
import { LoadError } from "../ui/LoadError";

/** Owner's list of replies. Opening it marks them as read. */
export function RepliesPanel({ tagId, allowReplies, onRead }: { tagId: string; allowReplies: boolean; onRead: () => void }) {
  const [replies, setReplies] = useState<Reply[] | null>(null);
  const [toDelete, setToDelete] = useState<Reply | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    api.listReplies(tagId).then(async (list) => {
      if (!alive) return;
      setReplies(list);
      if (list.some((r) => !r.read)) {
        await api.markRepliesRead(tagId);
        onRead();
      }
    }).catch((e) => alive && setLoadError(e));
    return () => { alive = false; };
  }, [tagId, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove() {
    if (!toDelete) return;
    try {
      await api.deleteReply(tagId, toDelete.id);
      setReplies((list) => (list ?? []).filter((r) => r.id !== toDelete.id));
      toast.show("Reply deleted");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Could not delete", { kind: "error" });
    } finally {
      setToDelete(null);
    }
  }

  return (
    <section className="card stack" aria-labelledby="sec-replies">
      <h2 id="sec-replies" className="section-title">Replies {replies && replies.length > 0 && <span className="muted">({replies.length})</span>}</h2>
      {!allowReplies && <p className="muted small">Replies are off for this tag. Turn them on in Edit.</p>}
      {loadError ? (
        <LoadError error={loadError} onRetry={() => { setLoadError(null); setAttempt((n) => n + 1); }} />
      ) : replies === null ? (
        <div className="spinner" role="status" aria-label="Loading replies" />
      ) : replies.length === 0 ? (
        <p className="muted">No replies yet.</p>
      ) : (
        <ul className="replies">
          {replies.map((r) => (
            <li key={r.id} className={r.read ? "" : "reply-unread"}>
              <div className="row">
                <strong>{r.name}</strong>
                {!r.read && <span className="badge badge-gift">New</span>}
                <span className="spacer" />
                <span className="muted small">{formatDateTime(r.createdAt)}</span>
                <button type="button" className="btn btn-ghost icon-btn" aria-label={`Delete reply from ${r.name}`} onClick={() => setToDelete(r)}><IconTrash size={18} /></button>
              </div>
              <p className="prewrap">{r.message}</p>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={!!toDelete} title={`Delete the reply from ${toDelete?.name}?`} confirmLabel="Delete" danger onConfirm={remove} onCancel={() => setToDelete(null)}>
        This cannot be undone.
      </ConfirmDialog>
    </section>
  );
}

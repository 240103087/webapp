import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { formatBoxNumber } from "@moveeasy/shared";
import { api, ApiError } from "../api";
import type { MoveDetail } from "../api/types";
import { Button, ButtonLink } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EmptyState } from "../ui/EmptyState";
import { useToast } from "../ui/Toast";
import { useTitle } from "../ui/useTitle";
import { formatDate } from "../ui/Badge";
import { IconBox, IconEdit, IconPlus, IconPrinter, IconTrash } from "../ui/icons";
import { MoveForm } from "../components/MoveForm";
import { MoveSearch } from "../components/MoveSearch";

export function MovePage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [move, setMove] = useState<MoveDetail | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const nav = useNavigate();
  const toast = useToast();
  useTitle(move?.name ?? "Move");
  const load = useCallback(() => {
    api.getMove(id!).then(setMove).catch((e: ApiError) => setError(e.status === 404 ? "This move does not exist or is not yours." : e.message));
  }, [id]);
  useEffect(load, [load]);

  async function remove() {
    try {
      await api.deleteMove(id!);
      toast.show("Move deleted");
      nav("/moves");
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : "Could not delete");
    } finally {
      setConfirm(false);
    }
  }

  if (error) return <div className="container narrow"><div className="alert" role="alert">{error} <Link to="/moves">All moves</Link></div></div>;
  if (!move) return <div className="container"><div className="spinner" role="status" aria-label="Loading" /></div>;
  const searching = !!params.get("q");

  return (
    <div className="container">
      <p><Link to="/moves">← Moves</Link></p>
      {editing ? (
        <div className="narrow" style={{ marginBottom: 24 }}>
          <MoveForm move={move} onSaved={() => { setEditing(false); load(); }} onCancel={() => setEditing(false)} />
        </div>
      ) : (
        <div className="page-head move-head">
          <div>
            <h1>{move.name}</h1>
            <p className="muted">
              {[move.fromAddress, move.toAddress].filter(Boolean).join(" → ")}
              {move.date ? ` · ${formatDate(move.date)}` : ""} · <strong>{move.boxCount} {move.boxCount === 1 ? "box" : "boxes"}</strong>
            </p>
          </div>
          <div className="row">
            <ButtonLink to={`/tags/new?kind=box&move=${move.id}`} variant="primary" icon={<IconPlus size={18} />}>Add box</ButtonLink>
            <ButtonLink to={`/print?move=${move.id}`} icon={<IconPrinter size={18} />}>Print labels for this move</ButtonLink>
            <Button icon={<IconEdit size={18} />} onClick={() => setEditing(true)}>Edit</Button>
            <Button variant="danger" icon={<IconTrash size={18} />} onClick={() => { setDeleteError(""); if (move.boxCount > 0) setDeleteError("Move the boxes to another move or delete them first"); else setConfirm(true); }}>Delete</Button>
          </div>
        </div>
      )}
      {deleteError && <div className="alert" role="alert" style={{ marginBottom: 16 }}>{deleteError}</div>}

      <MoveSearch moveId={move.id} />

      {!searching &&
        (move.rooms.length === 0 ? (
          <EmptyState icon={<IconBox size={40} />} title="No boxes yet" text="Add a tag for every box: what is inside and which room it goes to." action={<ButtonLink to={`/tags/new?kind=box&move=${move.id}`} variant="primary">Add the first box</ButtonLink>} />
        ) : (
          <div className="rooms">
            {move.rooms.map((r) => (
              <section key={r.room} className="room" aria-labelledby={`room-${r.room}`}>
                <h2 id={`room-${r.room}`} className="room-title">{r.room} <span className="muted">· {r.boxes.length}</span></h2>
                <ul className="box-cards">
                  {r.boxes.map((b) => (
                    <li key={b.id}>
                      <Link to={`/tags/${b.id}`} className="box-card">
                        <span className="box-chip mono">{b.boxNumber !== null ? formatBoxNumber(b.boxNumber) : "BOX"}</span>
                        <span className="box-title">{b.title}</span>
                        <span className="muted small">{b.contents.length} {b.contents.length === 1 ? "item" : "items"}</span>
                        {b.fragile && <span className="badge badge-fragile">FRAGILE</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ))}
      <ConfirmDialog open={confirm} title={`Delete “${move.name}”?`} confirmLabel="Delete move" danger onConfirm={remove} onCancel={() => setConfirm(false)}>
        The move has no boxes. This cannot be undone.
      </ConfirmDialog>
    </div>
  );
}

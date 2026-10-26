import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import type { Move } from "../api/types";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { TruckArt } from "../ui/illustrations";
import { IconPlus, IconTruck } from "../ui/icons";
import { useTitle } from "../ui/useTitle";
import { MoveForm } from "../components/MoveForm";
import { formatDate } from "../ui/Badge";
import { LoadError } from "../ui/LoadError";

export function MovesPage() {
  useTitle("Moves");
  const [moves, setMoves] = useState<Move[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [creating, setCreating] = useState(false);
  const nav = useNavigate();
  const load = useCallback(() => {
    setError(null);
    api.listMoves().then(setMoves).catch(setError);
  }, []);
  useEffect(load, [load]);
  return (
    <div className="container">
      <div className="page-head">
        <div>
          <h1>Moves</h1>
          <p className="muted">Number your boxes, list what is inside, and find anything on moving day.</p>
        </div>
        {!creating && <Button variant="primary" icon={<IconPlus size={18} />} onClick={() => setCreating(true)}>New move</Button>}
      </div>
      {creating && <div className="narrow" style={{ marginBottom: 24 }}><MoveForm onSaved={(m) => nav(`/moves/${m.id}`)} onCancel={() => setCreating(false)} /></div>}
      {error ? (
        <LoadError error={error} onRetry={load} />
      ) : moves === null ? (
        <div className="spinner" role="status" aria-label="Loading" />
      ) : moves.length === 0 ? (
        !creating && <EmptyState icon={<TruckArt />} title="No moves yet" text="Create a move, then add a tag for every box." action={<Button variant="primary" onClick={() => setCreating(true)}>Create a move</Button>} />
      ) : (
        <ul className="move-list">
          {moves.map((m) => (
            <li key={m.id}>
              <Link to={`/moves/${m.id}`} className="move-card card">
                <span className="move-icon" aria-hidden="true"><IconTruck size={28} /></span>
                <span className="stack" style={{ gap: 2 }}>
                  <strong className="move-name">{m.name}</strong>
                  <span className="muted small">{[m.fromAddress, m.toAddress].filter(Boolean).join(" → ") || "No addresses"}{m.date ? ` · ${formatDate(m.date)}` : ""}</span>
                </span>
                <span className="spacer" />
                <span className="move-count mono">{m.boxCount} {m.boxCount === 1 ? "box" : "boxes"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

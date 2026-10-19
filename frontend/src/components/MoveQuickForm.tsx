import { useState } from "react";
import { fieldErrors, moveInputSchema } from "@moveeasy/shared";
import { api, ApiError } from "../api";
import type { Move } from "../api/types";
import { Button } from "../ui/Button";
import { TextField } from "../ui/Field";

/** Small inline form to create a move without leaving the tag editor. */
export function MoveQuickForm({ onCreated, onCancel }: { onCreated: (m: Move) => void; onCancel?: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function create() {
    const r = moveInputSchema.safeParse({ name });
    if (!r.success) return setError(fieldErrors(r.error).name ?? "Name is required");
    setBusy(true);
    try {
      onCreated(await api.createMove({ name }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create the move");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="quick-move card">
      <TextField
        label="New move name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error}
        placeholder="e.g. Almaty → Astana"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void create();
          }
        }}
      />
      <div className="row">
        <Button variant="primary" size="sm" onClick={create} busy={busy} busyLabel="Creating...">Create move</Button>
        {onCancel && <Button size="sm" onClick={onCancel}>Cancel</Button>}
      </div>
    </div>
  );
}

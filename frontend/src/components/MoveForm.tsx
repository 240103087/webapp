import { useState, type FormEvent } from "react";
import { fieldErrors, moveInputSchema } from "@moveeasy/shared";
import { api, ApiError } from "../api";
import type { Move } from "../api/types";
import { Button } from "../ui/Button";
import { TextField } from "../ui/Field";

export function MoveForm({ move, onSaved, onCancel }: { move?: Move; onSaved: (m: Move) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: move?.name ?? "", fromAddress: move?.fromAddress ?? "", toAddress: move?.toAddress ?? "", date: move?.date ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  async function submit(e: FormEvent) {
    e.preventDefault();
    const r = moveInputSchema.safeParse(form);
    if (!r.success) return setErrors(fieldErrors(r.error));
    setErrors({});
    setBusy(true);
    try {
      onSaved(move ? await api.updateMove(move.id, form) : await api.createMove(form));
    } catch (err) {
      setErrors(err instanceof ApiError && err.fields ? err.fields : { name: err instanceof Error ? err.message : "Could not save" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="card stack move-form" onSubmit={submit} noValidate>
      <h2 className="section-title">{move ? "Edit move" : "New move"}</h2>
      <TextField label="Name" name="name" value={form.name} onChange={set("name")} error={errors.name} maxLength={60} placeholder="e.g. Almaty → Astana" />
      <div className="grid-2">
        <TextField label="From (optional)" name="fromAddress" value={form.fromAddress} onChange={set("fromAddress")} error={errors.fromAddress} maxLength={120} />
        <TextField label="To (optional)" name="toAddress" value={form.toAddress} onChange={set("toAddress")} error={errors.toAddress} maxLength={120} />
      </div>
      <TextField label="Moving day (optional)" name="date" type="date" value={form.date} onChange={set("date")} error={errors.date} className="date-field" />
      <div className="row">
        <Button type="submit" variant="primary" busy={busy} busyLabel="Saving...">{move ? "Save" : "Create move"}</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

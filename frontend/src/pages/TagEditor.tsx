import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useBlocker, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ROOM_SUGGESTIONS, fieldErrors, tagInputSchema, type TagInput, type TagKind } from "@moveeasy/shared";
import { api, ApiError } from "../api";
import type { Move, Tag } from "../api/types";
import { Button } from "../ui/Button";
import { SelectField, Switch, TextArea, TextField } from "../ui/Field";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useToast } from "../ui/Toast";
import { useTitle } from "../ui/useTitle";
import { KindIcon, KIND_LABEL } from "../ui/Badge";
import { IconAlert } from "../ui/icons";
import { ContentsEditor } from "../components/ContentsEditor";
import { MoveQuickForm } from "../components/MoveQuickForm";
import { LoadError } from "../ui/LoadError";
import { PrivacyFields, type PrivacyState } from "../components/PrivacyFields";

export interface FormState extends PrivacyState {
  kind: TagKind;
  title: string;
  recipient: string;
  message: string;
  moveId: string;
  room: string;
  contents: string[];
  fragile: boolean;
}

const defaultsFor = (kind: TagKind) => ({ theme: kind === "box" ? "kraft" : "paper", allowReplies: kind !== "box" }) as const;

function emptyForm(kind: TagKind, moveId: string): FormState {
  return {
    kind, title: "", recipient: "", message: "", moveId, room: "", contents: [], fragile: false,
    privacy: "public", pin: "", changePin: true, hasPin: false, timeLock: false, opensAtLocal: "", ...defaultsFor(kind),
  };
}

export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fromTag(t: Tag): FormState {
  return {
    kind: t.kind, title: t.title, recipient: t.recipient ?? "", message: t.message, moveId: t.moveId ?? "", room: t.room ?? "",
    contents: t.contents, fragile: t.fragile, theme: t.theme, privacy: t.privacy, pin: "", changePin: !t.hasPin, hasPin: t.hasPin,
    timeLock: !!t.opensAt, opensAtLocal: toLocalInput(t.opensAt), allowReplies: t.allowReplies,
  };
}

export function toInput(f: FormState): TagInput {
  return {
    kind: f.kind, title: f.title, recipient: f.recipient, message: f.message, theme: f.theme, privacy: f.privacy,
    pin: f.privacy === "pin" && f.changePin && f.pin ? f.pin : null,
    opensAt: f.timeLock && f.opensAtLocal ? new Date(f.opensAtLocal).toISOString() : null,
    allowReplies: f.allowReplies, moveId: f.kind === "box" ? f.moveId || null : null, room: f.room, contents: f.contents, fragile: f.fragile,
  };
}

/** Checks done in the browser before saving (the service checks again). */
export function validate(f: FormState, original: Tag | null, now = new Date()): Record<string, string> {
  const errors: Record<string, string> = {};
  const r = tagInputSchema.safeParse(toInput(f));
  if (!r.success) Object.assign(errors, fieldErrors(r.error));
  if (f.privacy === "pin" && f.changePin && !f.pin) errors.pin = "Set a PIN of 4 to 6 digits";
  if (f.timeLock) {
    if (!f.opensAtLocal) errors.opensAt = "Choose when it opens";
    else {
      const iso = new Date(f.opensAtLocal).toISOString();
      const unchanged = original?.opensAt && toLocalInput(original.opensAt) === f.opensAtLocal;
      if (!unchanged && Date.parse(iso) <= now.getTime()) errors.opensAt = "The open date must be in the future";
    }
  }
  return errors;
}

const FIELD_ORDER = ["kind", "title", "recipient", "message", "moveId", "room", "contents", "privacy", "pin", "opensAt", "theme"];

export function TagEditor() {
  const { id } = useParams();
  const editing = !!id;
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  useTitle(editing ? "Edit tag" : "New tag");

  const initialKind = (["gift", "box", "keepsake"].includes(params.get("kind") ?? "") ? params.get("kind") : "gift") as TagKind;
  const [original, setOriginal] = useState<Tag | null>(null);
  const [form, setForm] = useState<FormState | null>(editing ? null : emptyForm(initialKind, params.get("move") ?? ""));
  const [initial, setInitial] = useState<string>(editing ? "" : JSON.stringify(emptyForm(initialKind, params.get("move") ?? "")));
  const [moves, setMoves] = useState<Move[] | null>(null);
  const [showMoveForm, setShowMoveForm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    api.listMoves().then(setMoves).catch(() => setMoves([]));
    if (editing) {
      api
        .getTag(id!)
        .then((t) => {
          setOriginal(t);
          const f = fromTag(t);
          setForm(f);
          setInitial(JSON.stringify(f));
        })
        .catch(setLoadError);
    }
  }, [editing, id, attempt]);

  const dirty = !!form && JSON.stringify(form) !== initial && !saved;
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const moveOptions = useMemo(() => moves ?? [], [moves]);

  if (loadError)
    return (
      <div className="container narrow">
        <LoadError error={loadError} notFound="This tag does not exist or is not yours." onRetry={() => { setLoadError(null); setAttempt((n) => n + 1); }} />
      </div>
    );
  if (!form) return <div className="container narrow"><div className="spinner" role="status" aria-label="Loading" /></div>;

  function switchKind(kind: TagKind) {
    setForm((f) => {
      if (!f) return f;
      const prevDefaults = defaultsFor(f.kind);
      const next = { ...f, kind };
      if (!editing) {
        if (f.theme === prevDefaults.theme) next.theme = defaultsFor(kind).theme;
        if (f.allowReplies === prevDefaults.allowReplies) next.allowReplies = defaultsFor(kind).allowReplies;
      }
      return next;
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form || saving) return;
    setFormError("");
    const errs = validate(form, original);
    setErrors(errs);
    if (Object.keys(errs).length) {
      focusFirst(errs);
      return;
    }
    setSaving(true);
    try {
      const input = toInput(form);
      const tag = editing ? await api.updateTag(id!, input) : await api.createTag(input);
      setSaved(true);
      toast.show(editing ? "Changes saved" : "Tag created");
      setTimeout(() => nav(`/tags/${tag.id}`), 0);
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setErrors(err.fields);
        focusFirst(err.fields);
      } else setFormError(err instanceof ApiError ? err.message : "Could not save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  function focusFirst(errs: Record<string, string>) {
    const first = FIELD_ORDER.find((k) => errs[k]) ?? Object.keys(errs)[0];
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[name="${first}"], #field-${first}`);
      el?.focus();
    }, 0);
  }

  const noMoves = moves !== null && moves.length === 0;

  return (
    <div className="container editor">
      <div className="page-head">
        <div>
          <h1>{editing ? `Edit “${original?.title}”` : "New tag"}</h1>
          <p className="muted">{editing ? "Changes show up on the QR page right away." : "Fill in what the person who scans it should see."}</p>
        </div>
      </div>
      <form onSubmit={submit} noValidate className="editor-form">
        {formError && <div className="alert" role="alert"><IconAlert size={20} />{formError}</div>}
        {Object.keys(errors).length > 0 && <p className="sr-only" role="alert">Please fix {Object.keys(errors).length} field(s)</p>}

        <section className="card stack" aria-labelledby="sec-what">
          <h2 id="sec-what" className="section-title">What is it?</h2>
          <fieldset className="field">
            <legend className="label">Kind</legend>
            <div className="segmented">
              {(["gift", "box", "keepsake"] as TagKind[]).map((k) => (
                <label key={k}>
                  <input type="radio" name="kind" value={k} checked={form.kind === k} onChange={() => switchKind(k)} />
                  <KindIcon kind={k} size={18} />
                  {KIND_LABEL[k]}
                </label>
              ))}
            </div>
          </fieldset>
          <TextField label="Title" name="title" value={form.title} onChange={(e) => set("title", e.target.value)} error={errors.title} maxLength={80}
            placeholder={form.kind === "box" ? "e.g. Kitchen everyday" : form.kind === "gift" ? "e.g. Keys to your first home" : "e.g. Grandpa's dombra"} />
          {form.kind !== "box" && (
            <TextField label="For whom (optional)" name="recipient" value={form.recipient} onChange={(e) => set("recipient", e.target.value)} error={errors.recipient} maxLength={60}
              help="Shown above the title: “For Aigerim”" />
          )}
          <TextArea label={form.kind === "box" ? "Note (optional)" : "Message"} name="message" value={form.message} onChange={(e) => set("message", e.target.value)} error={errors.message} maxLength={5000}
            help={form.kind === "keepsake" ? "The story of this thing. Line breaks are kept." : "Line breaks are kept."} />
        </section>

        {form.kind === "box" && (
          <section className="card stack" aria-labelledby="sec-box">
            <h2 id="sec-box" className="section-title">Moving box</h2>
            {noMoves && !showMoveForm && (
              <div className="alert alert-info">
                Create a move first. Boxes are numbered inside a move.
              </div>
            )}
            {(noMoves || showMoveForm) ? (
              <MoveQuickForm
                onCreated={(m) => {
                  setMoves((list) => [...(list ?? []), m]);
                  set("moveId", m.id);
                  setShowMoveForm(false);
                }}
                onCancel={noMoves ? undefined : () => setShowMoveForm(false)}
              />
            ) : (
              <div className="row align-end">
                <SelectField label="Move" name="moveId" id="field-moveId" value={form.moveId} onChange={(e) => set("moveId", e.target.value)} error={errors.moveId} className="grow">
                  <option value="">Choose a move</option>
                  {moveOptions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </SelectField>
                <Button size="sm" onClick={() => setShowMoveForm(true)}>New move...</Button>
              </div>
            )}
            {original?.kind === "box" && original.boxNumber !== null && original.moveId !== form.moveId && form.moveId && (
              <p className="help">The box gets a new number in the other move.</p>
            )}
            <TextField label="Room" name="room" list="room-suggestions" value={form.room} onChange={(e) => set("room", e.target.value)} error={errors.room} maxLength={40}
              help="Where it goes in the new place" />
            <datalist id="room-suggestions">{ROOM_SUGGESTIONS.map((r) => <option key={r} value={r} />)}</datalist>
            <ContentsEditor value={form.contents} onChange={(v) => set("contents", v)} error={errors.contents} />
            <Switch label="Fragile" checked={form.fragile} onChange={(v) => set("fragile", v)} help="Adds a FRAGILE banner to the page and the label" />
          </section>
        )}

        <PrivacyFields value={form} onChange={(p) => setForm((f) => (f ? { ...f, ...p } : f))} errors={errors} kind={form.kind} />

        <div className="editor-actions">
          <Button type="submit" variant="primary" busy={saving} busyLabel="Saving...">{editing ? "Save changes" : "Create tag"}</Button>
          <Button onClick={() => nav(editing ? `/tags/${id}` : "/")}>Cancel</Button>
        </div>
      </form>

      <ConfirmDialog
        open={blocker.state === "blocked"}
        title="Leave without saving?"
        confirmLabel="Leave"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      >
        Your changes to this tag will be lost.
      </ConfirmDialog>
    </div>
  );
}

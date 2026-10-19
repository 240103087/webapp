import { useState, type FormEvent } from "react";
import { fieldErrors, replyInputSchema } from "@moveeasy/shared";
import { api, ApiError } from "../api";

export function ReplyForm({ code }: { code: string }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setStatus(null);
    const r = replyInputSchema.safeParse({ name, message });
    if (!r.success) return setErrors(fieldErrors(r.error));
    setErrors({});
    setBusy(true);
    try {
      await api.postReply(code, r.data);
      setName("");
      setMessage("");
      setStatus({ ok: true, text: "Thank you! Your reply was sent." });
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      else setStatus({ ok: false, text: err instanceof ApiError ? err.message : "Could not send. Check your connection." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="reply-box" aria-labelledby="reply-h">
      <h2 id="reply-h" className="public-h2">Say thank you</h2>
      <form onSubmit={submit} noValidate className="reply-form">
        <div className="field">
          <label htmlFor="reply-name">Your name</label>
          <input id="reply-name" className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "reply-name-err" : undefined} />
          {errors.name && <p className="pin-error" id="reply-name-err">{errors.name}</p>}
        </div>
        <div className="field">
          <label htmlFor="reply-msg">Message</label>
          <textarea id="reply-msg" className="textarea" rows={3} value={message} maxLength={1000} onChange={(e) => setMessage(e.target.value)} aria-invalid={errors.message ? true : undefined} aria-describedby={errors.message ? "reply-msg-err" : undefined} />
          {errors.message && <p className="pin-error" id="reply-msg-err">{errors.message}</p>}
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Sending..." : "Send"}</button>
        <div aria-live="polite">{status && <p className={status.ok ? "reply-ok" : "pin-error"}>{status.text}</p>}</div>
      </form>
    </section>
  );
}

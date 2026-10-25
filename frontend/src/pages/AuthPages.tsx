import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { DEMO_PASSWORD, SEED_USERS, fieldErrors, logInSchema, signUpSchema } from "@moveeasy/shared";
import { safeNext, useAuth } from "../auth/AuthContext";
import { ApiError } from "../api";
import { Button } from "../ui/Button";
import { TextField } from "../ui/Field";
import { IconAlert } from "../ui/icons";
import { Logo } from "../components/Layout";
import { useTitle } from "../ui/useTitle";
import { ScanArt } from "../ui/illustrations";

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-hero">
        <ScanArt />
      </div>
      <div className="auth-card card">
        <Logo />
        <h1>{title}</h1>
        {children}
      </div>
      <p className="auth-tagline muted">QR codes that give your gifts, boxes and keepsakes a memory.</p>
    </div>
  );
}

function focusFirstError(fields: Record<string, string>) {
  const first = Object.keys(fields)[0];
  if (first) setTimeout(() => document.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus(), 0);
}

export function LoginPage() {
  useTitle("Log in");
  const { logIn, sessionExpired } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const demo = SEED_USERS[0];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError("");
    const r = logInSchema.safeParse({ email, password });
    if (!r.success) {
      const f = fieldErrors(r.error);
      setErrors(f);
      focusFirstError(f);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await logIn(r.data.email, r.data.password);
      nav(safeNext(params.get("next")), { replace: true });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Log in">
      <form onSubmit={submit} noValidate className="stack">
        {sessionExpired && !formError && <p className="alert-soft" role="status">Your session has ended. Log in again to continue.</p>}
        {formError && (
          <div className="alert" role="alert">
            <IconAlert size={20} />
            {formError}
          </div>
        )}
        <TextField label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <TextField label="Password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <Button type="submit" variant="primary" busy={busy} busyLabel="Logging in...">Log in</Button>
      </form>
      <div className="demo-box">
        <p>
          <strong>Demo account:</strong> <span className="mono">{demo.email}</span> / <span className="mono">{DEMO_PASSWORD}</span>
        </p>
        <Button size="sm" onClick={() => { setEmail(demo.email); setPassword(DEMO_PASSWORD); }}>Use demo account</Button>
      </div>
      <p>
        New here? <Link to={`/signup${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`}>Create an account</Link>
      </p>
    </AuthShell>
  );
}

export function SignUpPage() {
  useTitle("Sign up");
  const { signUp } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError("");
    const r = signUpSchema.safeParse(form);
    if (!r.success) {
      const f = fieldErrors(r.error);
      setErrors(f);
      focusFirstError(f);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await signUp(r.data.name, r.data.email, r.data.password);
      nav(safeNext(params.get("next")), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setErrors(err.fields);
        focusFirstError(err.fields);
      } else setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create an account">
      <form onSubmit={submit} noValidate className="stack">
        {formError && <div className="alert" role="alert"><IconAlert size={20} />{formError}</div>}
        <TextField label="Name" name="name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} />
        <TextField label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} />
        <TextField label="Password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} error={errors.password} help="At least 8 characters" />
        <Button type="submit" variant="primary" busy={busy} busyLabel="Creating...">Create account</Button>
      </form>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthShell>
  );
}

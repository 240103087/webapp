import { useEffect, useState, type FormEvent } from "react";
import { pinSchema } from "@moveeasy/shared";
import { api, ApiError } from "../api";
import { parts } from "./Countdown";

export function PinForm({ code, attemptsLeft, lockedUntil, onUnlocked }: { code: string; attemptsLeft: number; lockedUntil: string | null; onUnlocked: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [left, setLeft] = useState(attemptsLeft);
  const [lockUntil, setLockUntil] = useState<string | null>(lockedUntil);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!lockUntil) return;
    const h = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(h);
  }, [lockUntil]);
  const locked = !!lockUntil && Date.parse(lockUntil) > now;
  useEffect(() => {
    if (lockUntil && !locked) {
      setLockUntil(null);
      setLeft(5);
      setError("");
    }
  }, [lockUntil, locked]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || locked) return;
    if (!pinSchema.safeParse(pin).success) {
      setError("PIN must be 4 to 6 digits");
      return;
    }
    setBusy(true);
    try {
      await api.unlockTag(code, pin);
      onUnlocked();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.attemptsLeft !== undefined) setLeft(err.attemptsLeft);
        if (err.lockedUntil) setLockUntil(err.lockedUntil);
      } else setError("Could not check the PIN. Check your connection.");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  const wait = lockUntil ? parts(Date.parse(lockUntil) - now) : null;
  return (
    <form className="pin-form" onSubmit={submit} noValidate>
      <label htmlFor="pin-input" className="pin-label">Enter the PIN</label>
      <input
        id="pin-input"
        className="pin-input mono"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        value={pin}
        disabled={locked}
        aria-invalid={error ? true : undefined}
        aria-describedby="pin-status"
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
      />
      <div id="pin-status" aria-live="polite" className="pin-status">
        {locked && wait ? (
          <p className="pin-error">Too many attempts. Try again in {wait.minutes}:{String(wait.seconds).padStart(2, "0")}.</p>
        ) : error ? (
          <p className="pin-error">{error}</p>
        ) : left < 5 ? (
          <p>{left} {left === 1 ? "attempt" : "attempts"} left</p>
        ) : (
          <p>The person who gave you this has the PIN.</p>
        )}
      </div>
      <button type="submit" className="btn btn-primary pin-submit" disabled={locked || busy}>{busy ? "Checking..." : "Open"}</button>
    </form>
  );
}

import { useId } from "react";
import { THEMES, type Privacy, type TagKind, type Theme } from "@moveeasy/shared";
import { Button } from "../ui/Button";
import { Switch, TextField } from "../ui/Field";
import { IconEyeOff, IconGlobe, IconLock } from "../ui/icons";

export interface PrivacyState {
  privacy: Privacy;
  pin: string;
  /** False while an existing PIN is kept unchanged. */
  changePin: boolean;
  hasPin: boolean;
  timeLock: boolean;
  opensAtLocal: string;
  allowReplies: boolean;
  theme: Theme;
}

export const THEME_INFO: Record<Theme, { name: string; bg: string; ink: string }> = {
  paper: { name: "Paper", bg: "#F6EFE3", ink: "#2B211A" },
  kraft: { name: "Kraft", bg: "#F3EBDD", ink: "#3B2F1C" },
  rose: { name: "Rose", bg: "#FBE7E4", ink: "#5A1E14" },
  sage: { name: "Sage", bg: "#E6EFE6", ink: "#1F3B26" },
  night: { name: "Night", bg: "#1D2230", ink: "#F4F1EA" },
  sky: { name: "Sky", bg: "#E3EEF8", ink: "#163452" },
};

const OPTIONS: { value: Privacy; title: string; text: string; icon: JSX.Element }[] = [
  { value: "public", title: "Public", text: "Anyone with the QR code", icon: <IconGlobe /> },
  { value: "pin", title: "PIN", text: "Visitors enter a 4-6 digit code", icon: <IconLock /> },
  { value: "private", title: "Private", text: "Only you", icon: <IconEyeOff /> },
];

export function PrivacyFields({ value, onChange, errors, kind }: { value: PrivacyState; onChange: (p: Partial<PrivacyState>) => void; errors: Record<string, string>; kind: TagKind }) {
  const themeLabel = useId();
  return (
    <section className="card stack" aria-labelledby="sec-privacy">
      <h2 id="sec-privacy" className="section-title">Who can see it</h2>
      <fieldset className="field">
        <legend className="label">Privacy</legend>
        <div className="radio-cards">
          {OPTIONS.map((o) => (
            <label key={o.value} className="radio-card">
              <input type="radio" name="privacy" value={o.value} checked={value.privacy === o.value}
                onChange={() => onChange({ privacy: o.value, ...(o.value === "pin" && !value.hasPin ? { changePin: true } : {}) })} />
              <span className="radio-card-icon">{o.icon}</span>
              <span>
                <strong>{o.title}</strong>
                <span className="muted small block">{o.text}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {value.privacy === "pin" &&
        (value.hasPin && !value.changePin ? (
          <div className="row pin-set">
            <span className="badge"><IconLock size={14} /> PIN is set</span>
            <Button size="sm" onClick={() => onChange({ changePin: true, pin: "" })}>Change PIN</Button>
          </div>
        ) : (
          <div className="row align-end">
            <TextField
              label={value.hasPin ? "New PIN" : "PIN"}
              name="pin"
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]*"
              maxLength={6}
              value={value.pin}
              onChange={(e) => onChange({ pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
              error={errors.pin}
              help="4 to 6 digits. Write it on the card or tell the person."
              className="pin-field"
            />
            {value.hasPin && <Button size="sm" onClick={() => onChange({ changePin: false, pin: "" })}>Keep the old PIN</Button>}
          </div>
        ))}

      <Switch label="Open on a date (time capsule)" checked={value.timeLock} onChange={(v) => onChange({ timeLock: v, opensAtLocal: v ? value.opensAtLocal : "" })} />
      {value.timeLock && (
        <>
          <TextField label="Opens on" name="opensAt" type="datetime-local" value={value.opensAtLocal} onChange={(e) => onChange({ opensAtLocal: e.target.value })} error={errors.opensAt}
            help="Your local time." className="date-field" />
          <p className="alert alert-info small">Before this date, visitors see only the title{kind !== "box" ? ", who it is for" : ""} and a countdown. The message and media stay hidden.</p>
        </>
      )}

      <Switch label="Allow replies" checked={value.allowReplies} onChange={(v) => onChange({ allowReplies: v })} help="Visitors can leave a short thank-you note." />

      <fieldset className="field">
        <legend className="label" id={themeLabel}>Page theme</legend>
        <div className="themes">
          {THEMES.map((t) => (
            <label key={t} className="theme-swatch" style={{ background: THEME_INFO[t].bg, color: THEME_INFO[t].ink }}>
              <input type="radio" name="theme" value={t} checked={value.theme === t} onChange={() => onChange({ theme: t })} />
              <span className="theme-aa" aria-hidden="true">Aa</span>
              <span className="theme-name">{THEME_INFO[t].name}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}

import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { IconAlert } from "./icons";

interface Common {
  label: string;
  help?: ReactNode;
  error?: string;
  hideLabel?: boolean;
}

function describedBy(id: string, help?: ReactNode, error?: string) {
  return [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

function Messages({ id, help, error }: { id: string; help?: ReactNode; error?: string }) {
  return (
    <>
      {help && <div className="help" id={`${id}-help`}>{help}</div>}
      {error && (
        <div className="error" id={`${id}-error`}>
          <IconAlert size={18} />
          <span>{error}</span>
        </div>
      )}
    </>
  );
}

export function TextField({ label, help, error, hideLabel, id, className = "", ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={`field ${className}`}>
      <label htmlFor={fid} className={hideLabel ? "sr-only" : undefined}>{label}</label>
      <input id={fid} className="input" aria-invalid={error ? true : undefined} aria-describedby={describedBy(fid, help, error)} {...rest} />
      <Messages id={fid} help={help} error={error} />
    </div>
  );
}

export function TextArea({ label, help, error, id, maxLength, value, className = "", ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={`field ${className}`}>
      <label htmlFor={fid}>{label}</label>
      <textarea id={fid} className="textarea" value={value} aria-invalid={error ? true : undefined} aria-describedby={describedBy(fid, help, error)} {...rest} />
      {maxLength !== undefined && (
        <div className="counter" aria-hidden="true">
          {String(value ?? "").length} / {maxLength}
        </div>
      )}
      <Messages id={fid} help={help} error={error} />
    </div>
  );
}

export function SelectField({ label, help, error, id, children, className = "", ...rest }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={`field ${className}`}>
      <label htmlFor={fid}>{label}</label>
      <select id={fid} className="select" aria-invalid={error ? true : undefined} aria-describedby={describedBy(fid, help, error)} {...rest}>
        {children}
      </select>
      <Messages id={fid} help={help} error={error} />
    </div>
  );
}

export function Switch({ label, checked, onChange, help }: { label: string; checked: boolean; onChange: (v: boolean) => void; help?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label className="switch" htmlFor={id}>
        <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-describedby={help ? `${id}-help` : undefined} />
        <span>{label}</span>
      </label>
      {help && <div className="help" id={`${id}-help`}>{help}</div>}
    </div>
  );
}

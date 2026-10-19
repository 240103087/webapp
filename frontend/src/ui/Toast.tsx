import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface Toast { id: number; text: string; kind: "info" | "error"; action?: { label: string; onClick: () => void } }
interface Ctx { show: (text: string, opts?: { kind?: "info" | "error"; action?: Toast["action"] }) => void }
const ToastContext = createContext<Ctx>({ show: () => {} });

let next = 1;
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const remove = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback<Ctx["show"]>(
    (text, opts) => {
      const id = next++;
      setToasts((t) => [...t.slice(-2), { id, text, kind: opts?.kind ?? "info", action: opts?.action }]);
      setTimeout(() => remove(id), opts?.action ? 8000 : 4000);
    },
    [remove],
  );
  const value = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind === "error" ? "toast-error" : ""}`}>
            <span>{t.text}</span>
            {t.action && (
              <button type="button" onClick={() => { t.action!.onClick(); remove(t.id); }}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

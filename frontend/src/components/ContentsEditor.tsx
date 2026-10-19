import { useRef } from "react";
import { IconPlus, IconTrash } from "../ui/icons";

/** List editor for box contents. Enter adds a row; pasting several lines adds several rows. */
export function ContentsEditor({ value, onChange, error }: { value: string[]; onChange: (v: string[]) => void; error?: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const rows = value.length ? value : [""];
  const focus = (i: number) => setTimeout(() => refs.current[i]?.focus(), 0);
  const set = (i: number, text: string) => onChange(rows.map((r, k) => (k === i ? text : r)));
  const insertAfter = (i: number, items: string[]) => {
    onChange([...rows.slice(0, i + 1), ...items, ...rows.slice(i + 1)]);
    focus(i + items.length);
  };
  const remove = (i: number) => {
    const next = rows.filter((_, k) => k !== i);
    onChange(next);
    focus(Math.max(0, i - 1));
  };
  return (
    <fieldset className="field contents-editor">
      <legend className="label">What is inside</legend>
      <p className="help" id="contents-help">One item per row. Press Enter for a new row, or paste a whole list.</p>
      <ol className="contents-rows">
        {rows.map((item, i) => (
          <li key={i} className="contents-row">
            <label className="sr-only" htmlFor={`item-${i}`}>Item {i + 1}</label>
            <input
              id={`item-${i}`}
              ref={(el) => (refs.current[i] = el)}
              className="input"
              value={item}
              maxLength={80}
              placeholder={i === 0 ? "e.g. Electric kettle" : ""}
              aria-describedby="contents-help"
              onChange={(e) => set(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  insertAfter(i, [""]);
                } else if (e.key === "Backspace" && item === "" && rows.length > 1) {
                  e.preventDefault();
                  remove(i);
                }
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
                if (lines.length > 1) {
                  e.preventDefault();
                  const [first, ...rest] = lines;
                  const merged = rows.map((r, k) => (k === i ? (r ? `${r}${first}` : first) : r));
                  onChange([...merged.slice(0, i + 1), ...rest, ...merged.slice(i + 1)]);
                  focus(i + rest.length);
                }
              }}
            />
            <button type="button" className="btn btn-ghost icon-btn" aria-label={`Remove item ${i + 1}`} onClick={() => remove(i)} disabled={rows.length === 1 && item === ""}>
              <IconTrash size={18} />
            </button>
          </li>
        ))}
      </ol>
      <div className="row">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertAfter(rows.length - 1, [""])} disabled={rows.length >= 100}>
          <IconPlus size={16} /> Add item
        </button>
        <span className="muted small">{value.filter((s) => s.trim()).length} / 100 items</span>
      </div>
      {error && <div className="error">{error}</div>}
    </fieldset>
  );
}

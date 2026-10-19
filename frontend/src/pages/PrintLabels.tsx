import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatBoxNumber, formatCode } from "@moveeasy/shared";
import { api } from "../api";
import type { Move, Tag } from "../api/types";
import { Button } from "../ui/Button";
import { useTitle } from "../ui/useTitle";
import { IconPrinter, IconSearch } from "../ui/icons";
import { publicUrl, qrSvg, svgDataUrl } from "../components/qr";
import { LoadError } from "../ui/LoadError";
import { KIND_LABEL } from "../ui/Badge";

export type LabelSize = "S" | "M" | "L";
export const SIZES: Record<LabelSize, { name: string; w: number; h: number; qr: number; cols: number; rows: number }> = {
  S: { name: "Small, 50 mm", w: 60, h: 55, qr: 32, cols: 3, rows: 5 },
  M: { name: "Medium, 70 mm", w: 90, h: 90, qr: 52, cols: 2, rows: 3 },
  L: { name: "Large, 100 mm", w: 180, h: 130, qr: 90, cols: 1, rows: 2 },
};
export const perPage = (s: LabelSize) => SIZES[s].cols * SIZES[s].rows;

export function PrintLabels() {
  useTitle("Print labels");
  const [params, setParams] = useSearchParams();
  const moveId = params.get("move") ?? "";
  const size = (["S", "M", "L"].includes(params.get("size") ?? "") ? params.get("size") : "M") as LabelSize;
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [qrs, setQrs] = useState<Record<string, string>>({});

  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoadError(null);
    Promise.all([api.listTags(), api.listMoves()])
      .then(([t, m]) => {
        if (!alive) return;
        setTags(t);
        setMoves(m);
      })
      .catch((e) => alive && setLoadError(e)); // #59: never leave a failed load unhandled
    return () => {
      alive = false;
    };
  }, [attempt]);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  const selected = useMemo(() => {
    if (!tags) return [];
    const list = moveId ? tags.filter((t) => t.moveId === moveId) : tags.filter((t) => picked.has(t.id));
    return [...list].sort((a, b) => (a.moveId === b.moveId ? (a.boxNumber ?? 0) - (b.boxNumber ?? 0) : a.title.localeCompare(b.title)));
  }, [tags, moveId, picked]);

  useEffect(() => {
    let alive = true;
    const missing = selected.filter((t) => !qrs[t.code]);
    if (!missing.length) return;
    Promise.all(missing.map(async (t) => [t.code, svgDataUrl(await qrSvg(publicUrl(t.code)))] as const)).then((pairs) => {
      if (alive) setQrs((q) => ({ ...q, ...Object.fromEntries(pairs) }));
    });
    return () => { alive = false; };
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const pages: Tag[][] = [];
  for (let i = 0; i < selected.length; i += perPage(size)) pages.push(selected.slice(i, i + perPage(size)));
  const visible = (tags ?? []).filter((t) => t.title.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase()));
  const spec = SIZES[size];

  return (
    <div className="container print-page">
      <div className="page-head no-print">
        <div>
          <h1>Print labels</h1>
          <p className="muted">Black on white, true size. Use sticker paper or tape the labels on.</p>
        </div>
        <Button variant="primary" icon={<IconPrinter size={18} />} disabled={selected.length === 0} onClick={() => window.print()}>Print</Button>
      </div>
      {loadError ? (
        <LoadError error={loadError} onRetry={() => setAttempt((n) => n + 1)} />
      ) : (
      <div className="print-layout">
        <aside className="card stack print-controls no-print" aria-label="What to print">
          <div className="field">
            <label htmlFor="print-move">A whole move</label>
            <select id="print-move" className="select" value={moveId} onChange={(e) => setParam("move", e.target.value)}>
              <option value="">Pick tags by hand</option>
              {moves.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.boxCount})</option>)}
            </select>
          </div>
          {!moveId && (
            <fieldset className="field">
              <legend className="label">Tags</legend>
              <div className="search-box">
                <IconSearch size={18} />
                <label htmlFor="print-filter" className="sr-only">Filter tags</label>
                <input id="print-filter" className="input" type="search" placeholder="Filter" value={filter} onChange={(e) => setFilter(e.target.value)} />
              </div>
              <div className="row">
                <Button size="sm" onClick={() => setPicked(new Set([...picked, ...visible.map((t) => t.id)]))}>Select all</Button>
                <Button size="sm" onClick={() => setPicked(new Set())}>Clear</Button>
              </div>
              <ul className="pick-list">
                {visible.map((t) => (
                  <li key={t.id}>
                    <label className="pick">
                      <input type="checkbox" checked={picked.has(t.id)} onChange={(e) => {
                        const next = new Set(picked);
                        if (e.target.checked) next.add(t.id);
                        else next.delete(t.id);
                        setPicked(next);
                      }} />
                      <span>{t.kind === "box" && t.boxNumber !== null ? `${formatBoxNumber(t.boxNumber)} · ` : ""}{t.title}</span>
                      <span className="muted small">{KIND_LABEL[t.kind]}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}
          <fieldset className="field">
            <legend className="label">Label size</legend>
            <div className="segmented">
              {(Object.keys(SIZES) as LabelSize[]).map((s) => (
                <label key={s}>
                  <input type="radio" name="size" value={s} checked={size === s} onChange={() => setParam("size", s)} />
                  {s}
                </label>
              ))}
            </div>
            <p className="help">{spec.name}. {perPage(size)} per A4 page. {selected.length} {selected.length === 1 ? "label" : "labels"}, {pages.length} {pages.length === 1 ? "page" : "pages"}.</p>
          </fieldset>
        </aside>

        <div className="sheets" aria-label="Print preview">
          {selected.length === 0 ? (
            <div className="empty card"><p>Pick a move or some tags to print.</p></div>
          ) : (
            pages.map((page, pi) => (
              <div key={pi} className="sheet" data-testid="sheet">
                <div className="sheet-grid" style={{ gridTemplateColumns: `repeat(${spec.cols}, ${spec.w}mm)`, gridAutoRows: `${spec.h}mm` }}>
                  {page.map((t) => (
                    <div key={t.id} className={`print-label print-label-${size}`} data-testid="label">
                      {qrs[t.code] ? <img src={qrs[t.code]} alt={`QR code for ${t.title}`} style={{ width: `${spec.qr}mm`, height: `${spec.qr}mm` }} /> : <div style={{ width: `${spec.qr}mm`, height: `${spec.qr}mm` }} />}
                      <div className="print-label-text">
                        {t.kind === "box" && t.boxNumber !== null && <div className="print-label-box mono">{formatBoxNumber(t.boxNumber)}</div>}
                        {t.kind === "box" && t.room && <div className="print-label-room">{t.room}</div>}
                        <div className="print-label-title">{t.title}</div>
                        <div className="print-label-code mono">{formatCode(t.code)}</div>
                        {t.kind === "box" && t.fragile && <div className="print-label-fragile">FRAGILE</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      )}
    </div>
  );
}

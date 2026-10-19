import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatBoxNumber, highlightParts } from "@moveeasy/shared";
import { api } from "../api";
import type { MoveSearchHit } from "../api/types";
import { IconSearch } from "../ui/icons";
import { LoadError } from "../ui/LoadError";

export function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlightParts(text, query).map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>))}
    </>
  );
}

export function MoveSearch({ moveId }: { moveId: string }) {
  const [params, setParams] = useSearchParams();
  const urlQ = params.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const [hits, setHits] = useState<MoveSearchHit[] | null>(null);
  const [searchError, setSearchError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const h = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (q.trim()) next.set("q", q);
      else next.delete("q");
      if ((next.get("q") ?? "") !== urlQ) setParams(next, { replace: true });
    }, 200);
    return () => clearTimeout(h);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!urlQ.trim()) {
      setHits(null);
      return;
    }
    let alive = true;
    setSearchError(null);
    api.searchMove(moveId, urlQ).then((r) => alive && setHits(r)).catch((e) => alive && setSearchError(e));
    return () => { alive = false; };
  }, [moveId, urlQ, attempt]);

  return (
    <section className="move-search" aria-label="Search this move">
      <div className="search-box big">
        <IconSearch size={22} />
        <label htmlFor="move-q" className="sr-only">Where is my...</label>
        <input id="move-q" type="search" className="input" placeholder="Where is my... kettle, passport, charger" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {searchError ? (
        <LoadError error={searchError} onRetry={() => setAttempt((n) => n + 1)} />
      ) : hits !== null && (
        <div aria-live="polite">
          {hits.length === 0 ? (
            <p className="muted search-empty">Nothing found in this move</p>
          ) : (
            <ul className="hits">
              {hits.map((h) => (
                <li key={h.tagId}>
                  <Link to={`/tags/${h.tagId}`} className="hit">
                    <span className="box-chip mono">{h.boxNumber !== null ? formatBoxNumber(h.boxNumber) : "BOX"}</span>
                    <span className="hit-body">
                      <span className="hit-where"><strong><Highlight text={h.title} query={urlQ} /></strong> · <Highlight text={h.room ?? "No room"} query={urlQ} /></span>
                      {h.matches.length > 0 && (
                        <span className="hit-items">
                          {h.matches.map((m, i) => <span key={i} className="hit-item"><Highlight text={m} query={urlQ} /></span>)}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

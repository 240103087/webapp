import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { TagKind } from "@moveeasy/shared";
import { api } from "../api";
import type { Move, Stats, Tag, TagQuery } from "../api/types";
import { TagCard } from "../components/TagCard";
import { Button, ButtonLink } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { IconMessage, IconPlus, IconScan, IconSearch, IconTag } from "../ui/icons";
import { EmptyTagsArt } from "../ui/illustrations";
import { useTitle } from "../ui/useTitle";
import { LoadError } from "../ui/LoadError";

const KINDS: { value: "" | TagKind; label: string }[] = [
  { value: "", label: "All" },
  { value: "gift", label: "Gifts" },
  { value: "box", label: "Boxes" },
  { value: "keepsake", label: "Keepsakes" },
];

export function Dashboard() {
  useTitle("My tags");
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const kind = (params.get("kind") ?? "") as "" | TagKind;
  const moveId = params.get("move") ?? "";
  const archived = params.get("archived") === "1";
  const sort = params.get("sort") === "scans" ? "scans" : "newest";

  const [tags, setTags] = useState<Tag[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState(q);
  const latest = useRef(0);

  const update = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  useEffect(() => setSearch(q), [q]);
  useEffect(() => {
    const h = setTimeout(() => {
      if (search !== q) update({ q: search });
    }, 250);
    return () => clearTimeout(h);
  }, [search, q, update]);

  const load = useCallback(() => {
    setError(null);
    setTags(null);
    const query: TagQuery = { q: q || undefined, kind: kind || undefined, moveId: moveId || undefined, archived, sort };
    // Only the latest request may update the page; an older, slower one is ignored.
    const n = ++latest.current;
    Promise.all([api.listTags(query), api.getStats(), api.listMoves()])
      .then(([t, s, m]) => {
        if (n !== latest.current) return;
        setTags(t);
        setStats(s);
        setMoves(m);
      })
      .catch((e) => n === latest.current && setError(e));
  }, [q, kind, moveId, archived, sort]);
  useEffect(load, [load]);

  const filtered = !!(q || kind || moveId || archived);

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <h1>My tags</h1>
          <p className="muted">Every QR code you have made, and what happened to it.</p>
        </div>
        <ButtonLink to="/tags/new" variant="primary" icon={<IconPlus size={18} />}>New tag</ButtonLink>
      </div>

      <section className="counters" aria-label="Summary">
        <div className="counter-card"><span className="counter-icon counter-icon-kraft" aria-hidden="true"><IconTag size={18} /></span><span className="counter-num">{stats?.tags ?? "–"}</span><span className="muted">Tags</span></div>
        <div className="counter-card"><span className="counter-icon counter-icon-teal" aria-hidden="true"><IconScan size={18} /></span><span className="counter-num">{stats?.scansThisWeek ?? "–"}</span><span className="muted">Scans this week</span></div>
        <div className={`counter-card ${stats?.unreadReplies ? "counter-hot" : ""}`}><span className="counter-icon counter-icon-accent" aria-hidden="true"><IconMessage size={18} /></span><span className="counter-num">{stats?.unreadReplies ?? "–"}</span><span className="muted">Unread replies</span></div>
      </section>

      <div className="toolbar" role="search">
        <div className="search-box">
          <IconSearch size={18} />
          <label htmlFor="tag-search" className="sr-only">Search tags by title</label>
          <input id="tag-search" className="input" type="search" placeholder="Search by title" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="chips" role="group" aria-label="Kind">
          {KINDS.map((k) => (
            <button key={k.label} type="button" className={`chip ${kind === k.value ? "chip-on" : ""}`} aria-pressed={kind === k.value} onClick={() => update({ kind: k.value })}>
              {k.label}
            </button>
          ))}
        </div>
        <div className="toolbar-selects">
          <label className="sr-only" htmlFor="move-filter">Move</label>
          <select id="move-filter" className="select" value={moveId} onChange={(e) => update({ move: e.target.value })}>
            <option value="">All moves</option>
            {moves.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <label className="sr-only" htmlFor="sort">Sort</label>
          <select id="sort" className="select" value={sort} onChange={(e) => update({ sort: e.target.value === "scans" ? "scans" : "" })}>
            <option value="newest">Newest first</option>
            <option value="scans">Most scanned</option>
          </select>
          <button type="button" className={`chip ${archived ? "chip-on" : ""}`} aria-pressed={archived} onClick={() => update({ archived: archived ? "" : "1" })}>
            Archived
          </button>
        </div>
      </div>

      {error ? (
        <LoadError error={error} onRetry={load} />
      ) : tags === null ? (
        <div className="tag-grid" aria-busy="true" aria-label="Loading tags">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton" style={{ height: 300 }} />)}
        </div>
      ) : tags.length === 0 ? (
        filtered ? (
          <EmptyState icon={<IconSearch size={40} />} title="No tags match" text="Try another word or clear the filters." action={<Button onClick={() => { setSearch(""); setParams({}, { replace: true }); }}>Clear filters</Button>} />
        ) : (
          <EmptyState icon={<EmptyTagsArt />} title="No tags yet" text="Make a QR code for a gift, a moving box or a keepsake, and attach a message, photos or your voice." action={<ButtonLink to="/tags/new" variant="primary">Create your first tag</ButtonLink>} />
        )
      ) : (
        <>
          <p className="sr-only" aria-live="polite">{tags.length} tags</p>
          <div className="tag-grid">
            {tags.map((t) => <TagCard key={t.id} tag={t} onChanged={load} />)}
          </div>
        </>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatBoxNumber, normalizeCode, type Theme } from "@moveeasy/shared";
import { api, ApiError } from "../api";
import type { PublicTag, PublicTagView } from "../api/types";
import { THEME_INFO } from "../components/PrivacyFields";
import { Gallery } from "../components/Gallery";
import { useTitle } from "../ui/useTitle";
import { KindIcon, formatLongDateTime } from "../ui/Badge";
import { IconLock } from "../ui/icons";
import { Countdown } from "../components/Countdown";
import { ArchivedArt, LostArt, SealedArt } from "../ui/illustrations";
import { PinForm } from "../components/PinForm";
import { ReplyForm } from "../components/ReplyForm";

export function PublicTagPage() {
  const { code: raw = "" } = useParams();
  const code = normalizeCode(raw) ?? raw;
  const [view, setView] = useState<PublicTagView | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    api
      .getPublicTag(code)
      .then(setView)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load this tag. Check your connection."));
  }, [code]);
  useEffect(load, [load]);

  const theme: Theme = view && "theme" in view ? view.theme : view?.state === "open" ? view.tag.theme : "paper";
  useTitle(view?.state === "open" ? view.tag.title : "MoveEasy");

  return (
    <div className={`public theme-${theme}`} style={{ background: THEME_INFO[theme].bg, color: THEME_INFO[theme].ink }}>
      <main className="public-inner">
        {error ? (
          <div className="public-message" role="alert">
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={load}>Try again</button>
          </div>
        ) : !view ? (
          <div className="public-message" aria-busy="true"><div className="spinner" role="status" aria-label="Loading" /></div>
        ) : view.state === "open" ? (
          <OpenTag tag={view.tag} preview={view.preview} />
        ) : (
          <LockedState view={view} code={code} onUnlocked={load} />
        )}
      </main>
      <footer className="public-footer">
        <Link to="/">Made with MoveEasy</Link>
      </footer>
    </div>
  );
}

export function LockedState({ view, code, onUnlocked }: { view: Exclude<PublicTagView, { state: "open" }>; code: string; onUnlocked: () => void }) {
  const [typed, setTyped] = useState("");
  const nav = useNavigate();
  switch (view.state) {
    case "unknown":
      return (
        <div className="public-message">
          <LostArt size={160} />
          <h1 className="public-title">No tag with this code</h1>
          <p>Check the code under the QR code and type it here.</p>
          <form className="code-form" onSubmit={(e) => { e.preventDefault(); const c = normalizeCode(typed); if (c) nav(`/t/${c}`); }}>
            <label htmlFor="code-input" className="sr-only">Tag code</label>
            <input id="code-input" className="input mono" placeholder="7KQ4 M2XP" value={typed} onChange={(e) => setTyped(e.target.value)} />
            <button className="btn btn-primary" type="submit" disabled={!normalizeCode(typed)}>Open</button>
          </form>
        </div>
      );
    case "archived":
      return (
        <div className="public-message">
          <ArchivedArt />
          <h1 className="public-title">This tag is no longer active</h1>
          <p>Its owner has archived it.</p>
        </div>
      );
    case "private":
      return (
        <div className="public-message">
          <SealedArt />
          <h1 className="public-title">This tag is private</h1>
          <p>Only its owner can see what is attached.</p>
        </div>
      );
    case "timeLocked":
      return (
        <div className="public-message time-locked">
          <span className="seal" aria-hidden="true"><IconLock size={30} /></span>
          {view.recipient && <p className="recipient">For {view.recipient}</p>}
          <h1 className="public-title">{view.title}</h1>
          <Countdown until={view.opensAt} onDone={onUnlocked} />
          <p>This capsule opens on <strong>{formatLongDateTime(view.opensAt)}</strong>.</p>
        </div>
      );
    case "pinRequired":
      return (
        <div className="public-message">
          <span className="state-icon" aria-hidden="true"><IconLock size={32} /></span>
          <h1 className="public-title">This tag is protected</h1>
          <PinForm code={code} attemptsLeft={view.attemptsLeft} lockedUntil={view.lockedUntil} onUnlocked={onUnlocked} />
        </div>
      );
  }
}

export function OpenTag({ tag, preview }: { tag: PublicTag; preview: boolean }) {
  return (
    <article className="open-tag">
      {preview && (
        <div className="preview-banner" role="note">
          Preview. Visitors see this page. <Link to="/">Back to my tags</Link>
        </div>
      )}
      {tag.kind === "box" ? (
        <header className="box-hero">
          <div className="box-number mono">{tag.boxNumber !== null ? formatBoxNumber(tag.boxNumber) : "BOX"}</div>
          {tag.room && <p className="box-room">Goes to <strong>{tag.room}</strong></p>}
          {tag.moveName && <p className="box-move">{tag.moveName}</p>}
        </header>
      ) : (
        <header className="tag-hero">
          <span className="kind-stamp" aria-hidden="true"><KindIcon kind={tag.kind} size={22} /></span>
          {tag.recipient && <p className="recipient">For {tag.recipient}</p>}
        </header>
      )}
      {tag.kind === "box" && tag.fragile && <div className="fragile-banner">FRAGILE · Handle with care</div>}
      <h1 className="public-title">{tag.title}</h1>
      {tag.message && <p className="public-text prewrap">{tag.message}</p>}
      {tag.kind === "box" && tag.contents.length > 0 && (
        <section aria-labelledby="inside">
          <h2 id="inside" className="public-h2">Inside this box</h2>
          <ul className="contents-list">
            {tag.contents.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </section>
      )}
      {tag.media.length > 0 && <Gallery media={tag.media} title={tag.title} />}
      {tag.allowReplies && !preview && <ReplyForm code={tag.code} />}
      {tag.allowReplies && preview && <p className="small">Visitors see a reply form here.</p>}
    </article>
  );
}

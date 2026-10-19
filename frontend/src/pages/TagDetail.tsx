import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatBoxNumber } from "@moveeasy/shared";
import { api, ApiError } from "../api";
import type { Tag } from "../api/types";
import { ButtonLink } from "../ui/Button";
import { KindBadge, PrivacyBadge, TimeLockBadge, formatDateTime } from "../ui/Badge";
import { IconEdit, IconExternal } from "../ui/icons";
import { useTitle } from "../ui/useTitle";
import { MediaManager } from "../components/MediaManager";
import { QrPanel } from "../components/QrPanel";
import { RepliesPanel } from "../components/RepliesPanel";
import { TagActions } from "../components/TagActions";

export function TagDetail() {
  const { id } = useParams();
  const [tag, setTag] = useState<Tag | null>(null);
  const [error, setError] = useState("");
  useTitle(tag?.title ?? "Tag");

  const load = useCallback(() => {
    api
      .getTag(id!)
      .then(setTag)
      .catch((e: ApiError) => setError(e.status === 404 ? "This tag does not exist or is not yours." : e.message));
  }, [id]);
  useEffect(load, [load]);

  if (error) return <div className="container narrow"><div className="alert" role="alert">{error} <Link to="/">Back to my tags</Link></div></div>;
  if (!tag) return <div className="container"><div className="spinner" role="status" aria-label="Loading" /></div>;

  return (
    <div className="container tag-detail">
      <p><Link to="/">← My tags</Link></p>
      <div className="page-head">
        <div className="stack" style={{ gap: 8 }}>
          <div className="row badges">
            <KindBadge kind={tag.kind} />
            <PrivacyBadge privacy={tag.privacy} />
            {tag.opensAt && Date.parse(tag.opensAt) > Date.now() && <TimeLockBadge opensAt={tag.opensAt} />}
            {tag.status === "archived" && <span className="badge badge-archived">Archived</span>}
          </div>
          <h1>{tag.title}</h1>
          {tag.status === "archived" && <p className="alert-soft">Archived. Visitors who scan this QR code see “This tag is no longer active”.</p>}
          {tag.recipient && <p className="muted">For {tag.recipient}</p>}
          {tag.kind === "box" && (
            <p className="muted">
              <span className="mono">{tag.boxNumber !== null ? formatBoxNumber(tag.boxNumber) : ""}</span> · {tag.room} ·{" "}
              {tag.moveId && <Link to={`/moves/${tag.moveId}`}>{tag.moveName}</Link>}
              {tag.fragile && <> · <span className="badge badge-fragile">FRAGILE</span></>}
            </p>
          )}
        </div>
        <div className="row">
          <ButtonLink to={`/t/${tag.code}`} target="_blank" rel="noopener" icon={<IconExternal size={18} />}>Open public page</ButtonLink>
          <ButtonLink to={`/tags/${tag.id}/edit`} variant="primary" icon={<IconEdit size={18} />}>Edit</ButtonLink>
          <TagActions tag={tag} onChange={(t) => setTag((old) => (old ? { ...old, status: t.status, updatedAt: t.updatedAt } : t))} />
        </div>
      </div>

      <div className="detail-grid">
        <div className="stack detail-main">
          <section className="card stack" aria-labelledby="sec-message">
            <h2 id="sec-message" className="section-title">{tag.kind === "box" ? "Contents" : "Message"}</h2>
            {tag.kind === "box" ? (
              tag.contents.length ? <ul className="plain-list">{tag.contents.map((c, i) => <li key={i}>{c}</li>)}</ul> : <p className="muted">No items listed yet.</p>
            ) : tag.message ? (
              <p className="prewrap">{tag.message}</p>
            ) : (
              <p className="muted">No message yet.</p>
            )}
            {tag.kind === "box" && tag.message && <p className="prewrap muted">{tag.message}</p>}
          </section>
          <MediaManager tag={tag} onChange={(media) => setTag((t) => (t ? { ...t, media } : t))} />
          <RepliesPanel tagId={tag.id} allowReplies={tag.allowReplies} onRead={() => setTag((t) => (t ? { ...t, unreadReplies: 0 } : t))} />
        </div>
        <aside className="stack detail-side" aria-label="Tag details">
          <QrPanel code={tag.code} title={tag.title} />
          <section className="card stack">
            <h2 className="section-title">Activity</h2>
            <dl className="facts">
              <div><dt>Scans</dt><dd>{tag.scanCount}</dd></div>
              <div><dt>Last scan</dt><dd>{tag.lastScanAt ? formatDateTime(tag.lastScanAt) : "Never"}</dd></div>
              <div><dt>Replies</dt><dd>{tag.replyCount}</dd></div>
              <div><dt>Created</dt><dd>{formatDateTime(tag.createdAt)}</dd></div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

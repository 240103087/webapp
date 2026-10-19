import { Link } from "react-router-dom";
import { formatBoxNumber, formatCode } from "@moveeasy/shared";
import type { Tag } from "../api/types";
import { KindBadge, KindIcon, PrivacyBadge, TimeLockBadge } from "../ui/Badge";
import { IconMessage, IconScan } from "../ui/icons";
import { TagCardMenu } from "./TagActions";

export function TagThumb({ tag }: { tag: Pick<Tag, "kind" | "coverUrl" | "boxNumber" | "title"> }) {
  if (tag.coverUrl) return <img className="thumb" src={tag.coverUrl} alt="" loading="lazy" />;
  return (
    <div className={`thumb thumb-${tag.kind}`} aria-hidden="true">
      {tag.kind === "box" && tag.boxNumber !== null ? <span className="mono thumb-box">{formatBoxNumber(tag.boxNumber)}</span> : <KindIcon kind={tag.kind} size={40} />}
    </div>
  );
}

export function TagCard({ tag, onChanged }: { tag: Tag; onChanged?: () => void }) {
  const locked = tag.opensAt && Date.parse(tag.opensAt) > Date.now();
  return (
    <article className={`tag-card ${tag.status === "archived" ? "tag-card-archived" : ""}`}>
      <Link to={`/tags/${tag.id}`} className="tag-card-link">
        <TagThumb tag={tag} />
        <div className="tag-card-body">
          <div className="row badges">
            <KindBadge kind={tag.kind} />
            <PrivacyBadge privacy={tag.privacy} />
            {locked && <TimeLockBadge opensAt={tag.opensAt!} />}
            {tag.status === "archived" && <span className="badge badge-archived">Archived</span>}
          </div>
          <h3 className="tag-card-title">{tag.title}</h3>
          {tag.kind === "box" ? (
            <p className="muted small">
              {tag.boxNumber !== null && <span className="mono">{formatBoxNumber(tag.boxNumber)}</span>} · {tag.room} · {tag.moveName}
            </p>
          ) : tag.recipient ? (
            <p className="muted small">For {tag.recipient}</p>
          ) : null}
          <div className="tag-card-foot">
            <span className="mono code">{formatCode(tag.code)}</span>
            <span className="spacer" />
            <span className="stat" title="Scans">
              <IconScan size={16} />
              <span className="sr-only">Scans:</span> {tag.scanCount}
            </span>
            <span className={`stat ${tag.unreadReplies ? "stat-unread" : ""}`} title="Replies">
              <IconMessage size={16} />
              <span className="sr-only">Replies:</span> {tag.replyCount}
              {tag.unreadReplies > 0 && <span className="unread-dot">{tag.unreadReplies} new</span>}
            </span>
          </div>
        </div>
      </Link>
      {onChanged && <TagCardMenu tag={tag} onChanged={onChanged} />}
    </article>
  );
}

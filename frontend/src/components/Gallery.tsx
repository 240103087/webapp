import { useEffect, useRef, useState } from "react";
import type { PublicMedia } from "../api/types";
import { IconChevronLeft, IconChevronRight, IconX } from "../ui/icons";

export function Gallery({ media, title }: { media: PublicMedia[]; title: string }) {
  const photos = media.filter((m) => m.type === "photo");
  const others = media.filter((m) => m.type !== "photo");
  const [open, setOpen] = useState<number | null>(null);
  const alt = (m: PublicMedia, i: number) => m.caption || `Photo ${i + 1} of ${title}`;

  return (
    <section className="gallery" aria-label="Photos, video and voice">
      {others.map((m) => (
        <figure key={m.id} className={`player player-${m.type}`}>
          {m.type === "video" ? (
            <video src={m.url} controls preload="metadata" playsInline aria-label={m.caption || "Video"} />
          ) : (
            <audio src={m.url} controls preload="metadata" aria-label={m.caption || "Voice message"} />
          )}
          {m.caption && <figcaption>{m.caption}</figcaption>}
        </figure>
      ))}
      {photos.length > 0 && (
        <ul className="photo-grid">
          {photos.map((m, i) => (
            <li key={m.id}>
              <button type="button" className="photo-btn" onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1} of ${photos.length}${m.caption ? `: ${m.caption}` : ""}`}>
                <img src={m.url} alt={alt(m, i)} loading="lazy" />
              </button>
              {m.caption && <p className="photo-caption">{m.caption}</p>}
            </li>
          ))}
        </ul>
      )}
      {open !== null && <Lightbox photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} title={title} />}
    </section>
  );
}

function Lightbox({ photos, index, onIndex, onClose, title }: { photos: PublicMedia[]; index: number; onIndex: (i: number) => void; onClose: () => void; title: string }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const m = photos[index];
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % photos.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + photos.length) % photos.length);
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); opener?.focus?.(); };
  }, [index, photos.length, onClose, onIndex]);
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`Photo ${index + 1} of ${photos.length}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <button ref={closeRef} type="button" className="lb-btn lb-close" aria-label="Close" onClick={onClose}><IconX /></button>
      {photos.length > 1 && <button type="button" className="lb-btn lb-prev" aria-label="Previous photo" onClick={() => onIndex((index - 1 + photos.length) % photos.length)}><IconChevronLeft /></button>}
      <figure>
        <img src={m.url} alt={m.caption || `Photo ${index + 1} of ${title}`} />
        <figcaption>{m.caption} <span className="lb-count">{index + 1} / {photos.length}</span></figcaption>
      </figure>
      {photos.length > 1 && <button type="button" className="lb-btn lb-next" aria-label="Next photo" onClick={() => onIndex((index + 1) % photos.length)}><IconChevronRight /></button>}
    </div>
  );
}

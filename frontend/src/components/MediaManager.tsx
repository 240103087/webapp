import { useRef, useState, type DragEvent } from "react";
import { MAX_MEDIA_PER_TAG, checkMediaFile, MEDIA_LIMITS } from "@moveeasy/shared";
import { api, ApiError } from "../api";
import type { Media, Tag } from "../api/types";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useToast } from "../ui/Toast";
import { VoiceRecorder } from "./VoiceRecorder";
import { IconAlert, IconArrowDown, IconArrowUp, IconPlay, IconTrash, IconUpload } from "../ui/icons";

interface Upload { key: string; name: string; progress: number; error?: string }

export function MediaManager({ tag, onChange }: { tag: Tag; onChange: (media: Media[]) => void }) {
  const [media, setMedia] = useState<Media[]>(tag.media);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [toDelete, setToDelete] = useState<Media | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const update = (list: Media[]) => {
    setMedia(list);
    onChange(list);
  };

  async function addFiles(files: File[]) {
    let room = MAX_MEDIA_PER_TAG - media.length - uploads.filter((u) => !u.error).length;
    const added: Media[] = [];
    await Promise.all(
      files.map(async (file, i) => {
        const key = `${Date.now()}-${i}-${file.name}`;
        const check = checkMediaFile(file.type, file.size);
        if (!check.ok) {
          setUploads((u) => [...u, { key, name: file.name, progress: 0, error: check.error }]);
          return;
        }
        if (room <= 0) {
          setUploads((u) => [...u, { key, name: file.name, progress: 0, error: `A tag can have at most ${MAX_MEDIA_PER_TAG} media files` }]);
          return;
        }
        room--;
        setUploads((u) => [...u, { key, name: file.name, progress: 0 }]);
        try {
          const m = await api.uploadMedia(tag.id, file, { onProgress: (p) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, progress: p } : x))) });
          added.push(m);
          setUploads((u) => u.filter((x) => x.key !== key));
          setMedia((list) => {
            const next = [...list, m].sort((a, b) => a.position - b.position);
            onChange(next);
            return next;
          });
        } catch (e) {
          setUploads((u) => u.map((x) => (x.key === key ? { ...x, error: e instanceof ApiError ? e.message : "Upload failed. Check your connection." } : x)));
        }
      }),
    );
    if (added.length) toast.show(added.length === 1 ? "File added" : `${added.length} files added`);
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...media];
    const [m] = next.splice(index, 1);
    next.splice(index + dir, 0, m);
    update(next.map((x, i) => ({ ...x, position: i })));
    try {
      update(await api.reorderMedia(tag.id, next.map((x) => x.id)));
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Could not reorder", { kind: "error" });
    }
  }

  async function saveCaption(m: Media, caption: string) {
    if (caption === m.caption) return;
    try {
      const saved = await api.updateMedia(tag.id, m.id, { caption });
      update(media.map((x) => (x.id === m.id ? saved : x)));
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Could not save the caption", { kind: "error" });
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusyDelete(true);
    try {
      await api.deleteMedia(tag.id, toDelete.id);
      update(media.filter((x) => x.id !== toDelete.id).map((x, i) => ({ ...x, position: i })));
      toast.show("Deleted");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Could not delete", { kind: "error" });
    } finally {
      setBusyDelete(false);
      setToDelete(null);
    }
  }

  const full = media.length >= MAX_MEDIA_PER_TAG;
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!full) void addFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <section className="card stack" aria-labelledby="sec-media">
      <div className="row">
        <h2 id="sec-media" className="section-title">Photos, video and voice</h2>
        <span className="spacer" />
        <span className="muted small">{media.length} / {MAX_MEDIA_PER_TAG}</span>
      </div>

      <div
        className={`dropzone ${dragging ? "dropzone-on" : ""} ${full ? "dropzone-full" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <IconUpload size={28} />
        {full ? (
          <p>This tag has {MAX_MEDIA_PER_TAG} files, the most it can have. Delete one to add another.</p>
        ) : (
          <>
            <p><strong>Drop files here</strong> or</p>
            <Button variant="secondary" onClick={() => input.current?.click()}>Choose files</Button>
          </>
        )}
        <p className="muted small">{MEDIA_LIMITS.photo.label}. {MEDIA_LIMITS.video.label}. {MEDIA_LIMITS.audio.label}.</p>
        <label className="sr-only" htmlFor="media-input">Add photos, videos or audio</label>
        <input id="media-input" ref={input} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/*"
          onChange={(e) => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} disabled={full} />
      </div>
      <VoiceRecorder tagId={tag.id} count={media.length} onSaved={(m) => { update([...media, m]); toast.show("Voice message saved"); }} />

      {uploads.length > 0 && (
        <ul className="uploads" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.key} className={u.error ? "upload-error" : ""}>
              <span className="upload-name">{u.name}</span>
              {u.error ? (
                <>
                  <span className="error"><IconAlert size={16} /> {u.error}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))}>Dismiss</button>
                </>
              ) : (
                <progress max={1} value={u.progress} aria-label={`Uploading ${u.name}`} />
              )}
            </li>
          ))}
        </ul>
      )}

      {media.length > 0 && (
        <ol className="media-list">
          {media.map((m, i) => (
            <li key={m.id} className={`media-item media-${m.type}`}>
              <div className="media-preview">
                {m.type === "photo" && <img src={m.url} alt={m.caption || `Photo ${i + 1} of ${tag.title}`} />}
                {m.type === "video" && (
                  <div className="video-thumb">
                    <video src={m.url} preload="metadata" muted aria-label={m.caption || `Video ${i + 1}`} />
                    <span className="play-badge" aria-hidden="true"><IconPlay size={20} /></span>
                  </div>
                )}
                {m.type === "audio" && <audio src={m.url} controls preload="none" aria-label={m.caption || `Audio ${i + 1}`} />}
              </div>
              <div className="media-meta">
                <label className="sr-only" htmlFor={`cap-${m.id}`}>Caption for item {i + 1}</label>
                <input id={`cap-${m.id}`} className="input" defaultValue={m.caption} maxLength={200} placeholder="Add a caption"
                  onBlur={(e) => void saveCaption(m, e.target.value.trim())}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                <div className="row media-actions">
                  <button type="button" className="btn btn-ghost icon-btn" aria-label={`Move item ${i + 1} up`} disabled={i === 0} onClick={() => void move(i, -1)}><IconArrowUp size={18} /></button>
                  <button type="button" className="btn btn-ghost icon-btn" aria-label={`Move item ${i + 1} down`} disabled={i === media.length - 1} onClick={() => void move(i, 1)}><IconArrowDown size={18} /></button>
                  <span className="spacer" />
                  <button type="button" className="btn btn-ghost icon-btn" aria-label={`Delete item ${i + 1}`} onClick={() => setToDelete(m)}><IconTrash size={18} /></button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <ConfirmDialog open={!!toDelete} title={`Delete this ${toDelete?.type ?? "file"}?`} confirmLabel="Delete" danger busy={busyDelete} onConfirm={confirmDelete} onCancel={() => setToDelete(null)}>
        It disappears from the QR page. This cannot be undone.
      </ConfirmDialog>
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import { MAX_MEDIA_PER_TAG } from "@moveeasy/shared";
import { api, ApiError } from "../api";
import type { Media } from "../api/types";
import { Button } from "../ui/Button";
import { IconMic } from "../ui/icons";

export const MAX_RECORDING_SECONDS = 180;
const TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg", "audio/mp4"];

function pickType(): string | undefined {
  const MR = (globalThis as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder;
  if (!MR || typeof MR.isTypeSupported !== "function") return undefined;
  return TYPES.find((t) => MR.isTypeSupported(t));
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

type Phase = "idle" | "recording" | "review" | "saving";

export function VoiceRecorder({ tagId, count, onSaved }: { tagId: string; count: number; onSaved: (m: Media) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTracks = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => () => {
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
    stopTracks();
  }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const supported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && "MediaRecorder" in globalThis;

  async function start() {
    setError("");
    if (!supported) {
      setError("This browser cannot record audio. Upload a file instead.");
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access was blocked. Allow it in the browser to record.");
      return;
    }
    const type = pickType();
    const r = new MediaRecorder(stream.current, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    r.onstop = () => {
      stopTracks();
      const b = new Blob(chunks, { type: (r.mimeType || type || "audio/webm").split(";")[0] });
      setBlob(b);
      setUrl(URL.createObjectURL(b));
      setPhase("review");
    };
    rec.current = r;
    r.start(1000);
    setSeconds(0);
    setPhase("recording");
    const startedAt = Date.now();
    timer.current = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(s);
      if (s >= MAX_RECORDING_SECONDS) stop();
    }, 250);
  }
  function stop() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
  }
  function discard() {
    setBlob(null);
    setUrl("");
    setPhase("idle");
  }
  async function save() {
    if (!blob) return;
    setPhase("saving");
    try {
      const m = await api.uploadMedia(tagId, blob, { caption: "Voice message" });
      onSaved(m);
      discard();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save the recording");
      setPhase("review");
    }
  }

  const full = count >= MAX_MEDIA_PER_TAG;
  return (
    <div className="recorder">
      {phase === "idle" && (
        <Button onClick={start} disabled={full} icon={<IconMic size={18} />}>Record voice</Button>
      )}
      {phase === "recording" && (
        <div className="row recording" role="status">
          <span className="rec-dot" aria-hidden="true" />
          <span>Recording <span className="mono">{fmt(seconds)}</span> / {fmt(MAX_RECORDING_SECONDS)}</span>
          <Button variant="primary" onClick={stop}>Stop</Button>
        </div>
      )}
      {(phase === "review" || phase === "saving") && (
        <div className="row review">
          <audio src={url} controls aria-label="Your recording" />
          <Button variant="primary" onClick={save} busy={phase === "saving"} busyLabel="Saving...">Save</Button>
          <Button onClick={discard} disabled={phase === "saving"}>Discard</Button>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}

import type { Privacy, TagKind } from "@moveeasy/shared";
import { IconBox, IconGift, IconGlobe, IconHeart, IconLock, IconEyeOff, IconClock } from "./icons";

export const KIND_LABEL: Record<TagKind, string> = { gift: "Gift", box: "Box", keepsake: "Keepsake" };
export const PRIVACY_LABEL: Record<Privacy, string> = { public: "Public", pin: "PIN", private: "Private" };

export function KindIcon({ kind, size = 16 }: { kind: TagKind; size?: number }) {
  if (kind === "gift") return <IconGift size={size} />;
  if (kind === "box") return <IconBox size={size} />;
  return <IconHeart size={size} />;
}

export function KindBadge({ kind }: { kind: TagKind }) {
  return (
    <span className={`badge badge-${kind}`}>
      <KindIcon kind={kind} size={14} />
      {KIND_LABEL[kind]}
    </span>
  );
}

export function PrivacyBadge({ privacy }: { privacy: Privacy }) {
  const Icon = privacy === "public" ? IconGlobe : privacy === "pin" ? IconLock : IconEyeOff;
  return (
    <span className="badge">
      <Icon size={14} />
      {PRIVACY_LABEL[privacy]}
    </span>
  );
}

export function TimeLockBadge({ opensAt }: { opensAt: string }) {
  return (
    <span className="badge badge-box">
      <IconClock size={14} />
      Opens {formatDate(opensAt)}
    </span>
  );
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}
export function formatLongDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} at ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

import type { ReactNode } from "react";
import type { TagKind } from "@moveeasy/shared";

/*
 * Flat illustrations in the paper-label look (#65): ink outlines, kraft,
 * tomato and teal fills. Always decorative, so they are hidden from
 * screen readers and hold no text. Colors follow `_docs/design-system.md`.
 */

const C = {
  ink: "#1B1A17",
  paper: "#FFFFFF",
  ground: "#FBFAF7",
  kraft: "#C9A774",
  kraftDark: "#B08D57",
  kraftTint: "#F3EBDD",
  accent: "#C63B23",
  rose: "#FBE3DE",
  teal: "#1F6F6B",
  tealTint: "#E2F0EE",
};

const line = { stroke: C.ink, strokeWidth: 2.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function Art({ w, h, size, className, children }: { w: number; h: number; size?: number; className?: string; children: ReactNode }) {
  const width = size ?? w;
  return (
    <svg className={`art ${className ?? ""}`} viewBox={`0 0 ${w} ${h}`} width={width} height={(width * h) / w} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/** A tiny QR-like mark: three finder squares and a few dots. */
function QrMark({ x, y, s }: { x: number; y: number; s: number }) {
  const u = s / 7;
  const finder = (fx: number, fy: number) => (
    <g key={`${fx}-${fy}`}>
      <rect x={fx} y={fy} width={u * 3} height={u * 3} fill={C.ink} />
      <rect x={fx + u * 0.75} y={fy + u * 0.75} width={u * 1.5} height={u * 1.5} fill={C.paper} />
    </g>
  );
  return (
    <g>
      <rect x={x} y={y} width={s} height={s} fill={C.paper} />
      {finder(x, y)}
      {finder(x + u * 4, y)}
      {finder(x, y + u * 4)}
      <rect x={x + u * 4} y={y + u * 4} width={u} height={u} fill={C.ink} />
      <rect x={x + u * 6} y={y + u * 5} width={u} height={u} fill={C.ink} />
      <rect x={x + u * 5} y={y + u * 6} width={u} height={u} fill={C.ink} />
    </g>
  );
}

function Sparkle({ x, y, r = 5, color = C.accent }: { x: number; y: number; r?: number; color?: string }) {
  return <path d={`M${x} ${y - r}V${y + r}M${x - r} ${y}H${x + r}`} stroke={color} strokeWidth={2.5} strokeLinecap="round" />;
}

/* ---------- Kind illustrations: 160 x 120 ---------- */

function GiftShape() {
  return (
    <g>
      <ellipse cx="80" cy="106" rx="50" ry="5" fill={C.ink} opacity="0.08" />
      <rect x="40" y="56" width="80" height="48" rx="3" fill={C.accent} {...line} />
      <rect x="34" y="42" width="92" height="16" rx="3" fill="#DD5A40" {...line} />
      <rect x="73" y="42" width="14" height="62" fill={C.rose} {...line} />
      <path d="M80 42c-6-14-26-18-28-6-1 8 16 8 28 6Z" fill={C.rose} {...line} />
      <path d="M80 42c6-14 26-18 28-6 1 8-16 8-28 6Z" fill={C.rose} {...line} />
      <path d="M120 64l12 10" {...line} fill="none" />
      <rect x="126" y="70" width="22" height="22" rx="3" transform="rotate(14 137 81)" fill={C.paper} {...line} />
      <g transform="rotate(14 137 81)"><QrMark x={130} y={74} s={14} /></g>
      <Sparkle x={26} y={30} />
      <Sparkle x={130} y={24} r={4} color={C.teal} />
    </g>
  );
}

function BoxShape() {
  return (
    <g>
      <ellipse cx="80" cy="106" rx="56" ry="5" fill={C.ink} opacity="0.08" />
      <path d="M28 40l10-14h84l10 14" fill={C.kraftDark} {...line} />
      <rect x="28" y="40" width="104" height="64" rx="3" fill={C.kraft} {...line} />
      <rect x="70" y="40" width="20" height="64" fill="#D9BF93" stroke="none" />
      <path d="M70 40v64M90 40v64" stroke={C.ink} strokeWidth={1.5} opacity="0.35" />
      <rect x="38" y="56" width="28" height="34" rx="3" fill={C.paper} {...line} />
      <QrMark x={43} y={61} s={18} />
      <path d="M43 84h18" stroke={C.ink} strokeWidth={2} strokeLinecap="round" />
      <path d="M104 74v-14m-5 5 5-5 5 5M116 74v-14m-5 5 5-5 5 5" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="98" y="82" width="24" height="7" rx="2" fill={C.accent} />
    </g>
  );
}

function KeepsakeShape() {
  return (
    <g>
      <ellipse cx="80" cy="106" rx="48" ry="5" fill={C.ink} opacity="0.08" />
      <g transform="rotate(-7 80 64)">
        <rect x="42" y="20" width="76" height="84" rx="3" fill={C.paper} {...line} />
        <rect x="50" y="28" width="60" height="52" fill={C.tealTint} stroke={C.ink} strokeWidth={2} />
        <circle cx="96" cy="40" r="6" fill="#E8B44C" />
        <path d="M50 80l18-20 12 12 10-8 20 16Z" fill={C.teal} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
        <path d="M58 92h30" stroke={C.ink} strokeWidth={2} strokeLinecap="round" opacity="0.5" />
      </g>
      <path d="M118 30c0-6 9-6 9 0 0-6 9-6 9 0 0 7-9 12-9 12s-9-5-9-12Z" fill={C.accent} {...line} />
      <path d="M68 16l6 8" {...line} />
      <rect x="62" y="10" width="14" height="6" rx="1" fill={C.kraft} {...line} transform="rotate(-20 69 13)" />
      <Sparkle x={30} y={44} r={4} color={C.teal} />
    </g>
  );
}

export function KindArt({ kind, size }: { kind: TagKind; size?: number }) {
  return (
    <Art w={160} h={120} size={size} className={`art-${kind}`}>
      {kind === "gift" ? <GiftShape /> : kind === "box" ? <BoxShape /> : <KeepsakeShape />}
    </Art>
  );
}

/* ---------- Scenes ---------- */

/** Dashboard with no tags yet: a gift, a box and a keepsake waiting for a code. */
export function EmptyTagsArt({ size = 260 }: { size?: number }) {
  return (
    <Art w={300} h={130} size={size}>
      <path d="M10 118h280" stroke={C.ink} strokeWidth={2} strokeLinecap="round" opacity="0.2" />
      <g transform="translate(-6 10) scale(0.8)"><GiftShape /></g>
      <g transform="translate(86 2) scale(0.9)"><BoxShape /></g>
      <g transform="translate(184 10) scale(0.8)"><KeepsakeShape /></g>
    </Art>
  );
}

/** Moves with nothing yet: a truck loaded with boxes. */
export function TruckArt({ size = 240 }: { size?: number }) {
  return (
    <Art w={240} h={130} size={size}>
      <ellipse cx="120" cy="116" rx="100" ry="5" fill={C.ink} opacity="0.08" />
      <rect x="20" y="30" width="130" height="72" rx="4" fill={C.kraftTint} {...line} />
      <rect x="32" y="62" width="34" height="30" rx="2" fill={C.kraft} {...line} />
      <rect x="44" y="62" width="10" height="30" fill="#D9BF93" />
      <rect x="72" y="50" width="40" height="42" rx="2" fill={C.kraft} {...line} />
      <rect x="86" y="50" width="12" height="42" fill="#D9BF93" />
      <rect x="118" y="70" width="24" height="22" rx="2" fill={C.accent} {...line} />
      <rect x="40" y="38" width="28" height="22" rx="2" fill={C.kraft} {...line} />
      <path d="M150 50h34l22 24v28h-56Z" fill={C.teal} {...line} />
      <path d="M160 58h22l14 16h-36Z" fill={C.tealTint} {...line} />
      <path d="M200 92h8" {...line} />
      <circle cx="58" cy="104" r="11" fill={C.ink} />
      <circle cx="58" cy="104" r="4" fill={C.ground} />
      <circle cx="180" cy="104" r="11" fill={C.ink} />
      <circle cx="180" cy="104" r="4" fill={C.ground} />
      <path d="M4 70h10M0 82h12M6 94h8" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" opacity="0.35" />
    </Art>
  );
}

/** 404 and unknown codes: an open box with a question mark above it. */
export function LostArt({ size = 180 }: { size?: number }) {
  return (
    <Art w={180} h={140} size={size}>
      <ellipse cx="90" cy="128" rx="60" ry="5" fill={C.ink} opacity="0.08" />
      <path d="M40 72 22 56l20-10 18 14Z" fill={C.kraftDark} {...line} />
      <path d="M140 72l18-16-20-10-18 14Z" fill={C.kraftDark} {...line} />
      <rect x="40" y="66" width="100" height="60" rx="3" fill={C.kraft} {...line} />
      <path d="M40 66h100" stroke={C.ink} strokeWidth={2.5} />
      <path d="M78 26c0-10 24-10 24 2 0 8-12 9-12 18" stroke={C.accent} strokeWidth={6} strokeLinecap="round" fill="none" />
      <circle cx="90" cy="56" r="3.5" fill={C.accent} />
      <rect x="52" y="82" width="34" height="14" rx="2" fill={C.paper} {...line} />
      <Sparkle x={34} y={30} r={4} color={C.teal} />
      <Sparkle x={150} y={26} r={5} />
    </Art>
  );
}

/** Private tag: an envelope closed with a wax seal. */
export function SealedArt({ size = 160 }: { size?: number }) {
  return (
    <Art w={160} h={120} size={size}>
      <ellipse cx="80" cy="106" rx="56" ry="5" fill={C.ink} opacity="0.08" />
      <rect x="22" y="28" width="116" height="74" rx="4" fill={C.kraftTint} {...line} />
      <path d="M22 32l58 40 58-40" fill="none" {...line} />
      <path d="M22 100l40-32M138 100 98 68" fill="none" {...line} opacity="0.5" />
      <circle cx="80" cy="70" r="15" fill={C.accent} {...line} />
      <path d="M74 66v-2a6 6 0 0 1 12 0v2" stroke={C.paper} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <rect x="72" y="66" width="16" height="11" rx="2" fill={C.paper} />
    </Art>
  );
}

/** Archived tag: a taped box resting, with a moon. */
export function ArchivedArt({ size = 160 }: { size?: number }) {
  return (
    <Art w={160} h={120} size={size}>
      <ellipse cx="80" cy="106" rx="56" ry="5" fill={C.ink} opacity="0.08" />
      <rect x="30" y="46" width="100" height="58" rx="3" fill="#D8CDB9" {...line} />
      <path d="M30 46h100" {...line} />
      <path d="M44 58l72 34M116 58 44 92" stroke="#EDE6D8" strokeWidth={9} strokeLinecap="round" />
      <path d="M44 58l72 34M116 58 44 92" stroke={C.ink} strokeWidth={1.5} strokeLinecap="round" opacity="0.3" />
      <path d="M126 14a14 14 0 1 0 14 18 11 11 0 0 1-14-18Z" fill="#E8B44C" {...line} />
      <path d="M98 22h8l-8 8h8M110 6h6l-6 6h6" stroke={C.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
    </Art>
  );
}

/** Log in and sign up: a phone scanning the QR tag on a gift. */
export function ScanArt({ size = 280 }: { size?: number }) {
  return (
    <Art w={300} h={200} size={size}>
      <circle cx="150" cy="104" r="92" fill={C.kraftTint} />
      <g transform="translate(18 64)"><GiftShape /></g>
      <g transform="rotate(10 222 92)">
        <rect x="186" y="26" width="72" height="132" rx="12" fill={C.ink} />
        <rect x="192" y="36" width="60" height="112" rx="6" fill={C.paper} />
        <rect x="204" y="48" width="36" height="12" rx="3" fill={C.rose} />
        <path d="M204 70h36M204 78h28M204 86h32" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" opacity="0.35" />
        <rect x="204" y="96" width="16" height="16" rx="2" fill={C.tealTint} />
        <rect x="224" y="96" width="16" height="16" rx="2" fill={C.kraft} />
        <path d="M222 124c0-4 6-4 6 0 0-4 6-4 6 0 0 5-6 8-6 8s-6-3-6-8Z" fill={C.accent} />
      </g>
      <path d="M182 128 156 140M182 140l-22 10" stroke={C.teal} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="2 6" />
      <Sparkle x={40} y={40} r={6} />
      <Sparkle x={270} y={180} r={5} color={C.teal} />
    </Art>
  );
}

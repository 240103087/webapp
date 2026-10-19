import type { Privacy } from "./schemas";

export type VisitorState = "unknown" | "archived" | "private" | "timeLocked" | "pinRequired" | "open";

export interface AccessTag {
  status: "active" | "archived";
  privacy: Privacy;
  opensAt: string | null;
}

export interface VisitorContext {
  now: Date;
  /** A valid PIN unlock for this tag. */
  unlocked: boolean;
  isOwner: boolean;
}

export interface VisitorDecision {
  state: VisitorState;
  preview: boolean;
}

/**
 * What a visitor may see. Checked in this order: unknown, archived, private,
 * timeLocked, pinRequired, open. The owner always gets a preview of the open tag.
 */
export function visitorView(tag: AccessTag | null, ctx: VisitorContext): VisitorDecision {
  if (!tag) return { state: "unknown", preview: false };
  if (ctx.isOwner) return { state: "open", preview: true };
  if (tag.status === "archived") return { state: "archived", preview: false };
  if (tag.privacy === "private") return { state: "private", preview: false };
  if (tag.opensAt && Date.parse(tag.opensAt) > ctx.now.getTime()) return { state: "timeLocked", preview: false };
  if (tag.privacy === "pin" && !ctx.unlocked) return { state: "pinRequired", preview: false };
  return { state: "open", preview: false };
}

export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCK_MINUTES = 15;
export const UNLOCK_HOURS = 24;

/**
 * Saving a tag ends every earlier PIN unlock when it stops being PIN-protected or a new PIN is set,
 * so an owner can shut out people who learned the old PIN (#60). Keeping the PIN keeps the unlocks.
 */
export function editEndsUnlocks(input: { privacy: string; pin?: string | null }): boolean {
  return input.privacy !== "pin" || !!input.pin;
}

/**
 * PIN attempts inside the window. Returns how many are left and, when
 * locked, until when.
 */
export function pinAttemptState(
  failedAt: string[],
  now: Date,
): { attemptsLeft: number; lockedUntil: string | null } {
  const windowStart = now.getTime() - PIN_LOCK_MINUTES * 60_000;
  const recent = failedAt.map((t) => Date.parse(t)).filter((t) => t > windowStart).sort((a, b) => a - b);
  if (recent.length >= PIN_MAX_ATTEMPTS) {
    const last = recent[recent.length - 1];
    return { attemptsLeft: 0, lockedUntil: new Date(last + PIN_LOCK_MINUTES * 60_000).toISOString() };
  }
  return { attemptsLeft: PIN_MAX_ATTEMPTS - recent.length, lockedUntil: null };
}

/** A visitor's repeat views of the same tag within this window count as one scan. */
export const SCAN_DEDUPE_MINUTES = 30;

/**
 * Whether a view should be counted as a new scan: not if the same visitor
 * already has a scan of this tag in the last `SCAN_DEDUPE_MINUTES`.
 * `scans` are the earlier scans of this one tag.
 */
export function shouldCountScan(scans: { visitorId: string | null; at: string }[], visitorId: string, now: Date): boolean {
  const since = now.getTime() - SCAN_DEDUPE_MINUTES * 60_000;
  return !scans.some((s) => s.visitorId === visitorId && Date.parse(s.at) > since);
}

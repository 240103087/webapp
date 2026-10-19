import type { Privacy, TagKind, Theme } from "@moveeasy/shared";

export interface PrivacyState {
  privacy: Privacy;
  pin: string;
  /** False while an existing PIN is kept unchanged. */
  changePin: boolean;
  hasPin: boolean;
  timeLock: boolean;
  opensAtLocal: string;
  allowReplies: boolean;
  theme: Theme;
}

/** Privacy, PIN, time lock, replies and theme. Filled in by #10. */
export function PrivacyFields(_: { value: PrivacyState; onChange: (p: Partial<PrivacyState>) => void; errors: Record<string, string>; kind: TagKind }) {
  return null;
}

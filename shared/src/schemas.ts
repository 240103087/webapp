import { z } from "zod";

export const TAG_KINDS = ["gift", "box", "keepsake"] as const;
export const PRIVACY_MODES = ["public", "pin", "private"] as const;
export const THEMES = ["paper", "kraft", "rose", "sage", "night", "sky"] as const;
export const ROOM_SUGGESTIONS = [
  "Kitchen",
  "Living room",
  "Bedroom",
  "Bathroom",
  "Kids room",
  "Office",
  "Hallway",
  "Storage",
];

export type TagKind = (typeof TAG_KINDS)[number];
export type Privacy = (typeof PRIVACY_MODES)[number];
export type Theme = (typeof THEMES)[number];

const trimmed = (min: number, max: number, label: string) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(min, min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
        .max(max, `${label} must be at most ${max} characters`),
    );

const optionalText = (max: number, label: string) =>
  z
    .string()
    .nullish()
    .transform((s) => (s ?? "").trim())
    .pipe(z.string().max(max, `${label} must be at most ${max} characters`))
    .transform((s) => (s === "" ? null : s));

export const emailSchema = z
  .string({ required_error: "Email is required" })
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.string().min(1, "Email is required").email("Enter a valid email address").max(254));

export const signUpSchema = z.object({
  name: trimmed(1, 60, "Name"),
  email: emailSchema,
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters"),
});

export const logInSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

export const pinSchema = z
  .string({ required_error: "PIN is required" })
  .regex(/^\d{4,6}$/, "PIN must be 4 to 6 digits");

const isoDateTime = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)) && /^\d{4}-\d{2}-\d{2}T/.test(s), "Enter a valid date and time");

export const contentsSchema = z
  .array(z.string())
  .default([])
  .transform((items) => items.map((s) => s.trim()).filter((s) => s.length > 0))
  .pipe(
    z
      .array(z.string().max(80, "Each item must be at most 80 characters"))
      .max(100, "A box can list at most 100 items"),
  );

const tagBase = z.object({
  kind: z.enum(TAG_KINDS, { errorMap: () => ({ message: "Choose gift, box or keepsake" }) }),
  title: trimmed(1, 80, "Title"),
  recipient: optionalText(60, "Recipient"),
  message: z
    .string()
    .nullish()
    .transform((s) => s ?? "")
    .pipe(z.string().max(5000, "Message must be at most 5000 characters")),
  theme: z.enum(THEMES, { errorMap: () => ({ message: "Choose a theme" }) }).default("paper"),
  privacy: z.enum(PRIVACY_MODES, { errorMap: () => ({ message: "Choose who can see this tag" }) }).default("public"),
  pin: pinSchema.nullish(),
  opensAt: isoDateTime.nullish().transform((s) => s ?? null),
  allowReplies: z.boolean().default(true),
  moveId: z.string().nullish().transform((s) => s || null),
  room: optionalText(40, "Room"),
  contents: contentsSchema,
  fragile: z.boolean().default(false),
});

/** Input for creating or updating a tag. Box fields are cleared for other kinds. */
export const tagInputSchema = tagBase.superRefine((t, ctx) => {
  if (t.kind === "box") {
    if (!t.moveId) ctx.addIssue({ code: "custom", path: ["moveId"], message: "Choose a move for this box" });
    if (!t.room) ctx.addIssue({ code: "custom", path: ["room"], message: "Room is required for a box" });
  }
}).transform((t) => {
  if (t.kind !== "box") return { ...t, moveId: null, room: null, contents: [] as string[], fragile: false };
  return { ...t, recipient: null };
});

export type TagInput = z.input<typeof tagInputSchema>;
export type TagInputParsed = z.output<typeof tagInputSchema>;

export const moveInputSchema = z.object({
  name: trimmed(1, 60, "Name"),
  fromAddress: optionalText(120, "From"),
  toAddress: optionalText(120, "To"),
  date: z
    .string()
    .nullish()
    .transform((s) => (s ? s : null))
    .refine((s) => s === null || (/^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))), "Enter a valid date"),
});
export type MoveInput = z.input<typeof moveInputSchema>;

export const replyInputSchema = z.object({
  name: trimmed(1, 60, "Name"),
  message: trimmed(1, 1000, "Message"),
});
export type ReplyInput = z.input<typeof replyInputSchema>;

export const mediaCaptionSchema = z
  .string()
  .nullish()
  .transform((s) => (s ?? "").trim())
  .pipe(z.string().max(200, "Caption must be at most 200 characters"));

export type MediaType = "photo" | "video" | "audio";
const MB = 1024 * 1024;
export const MEDIA_LIMITS: Record<MediaType, { mimes: string[]; maxBytes: number; label: string }> = {
  photo: { mimes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 10 * MB, label: "Photos (JPEG, PNG, WebP) up to 10 MB" },
  video: { mimes: ["video/mp4", "video/webm"], maxBytes: 50 * MB, label: "Videos (MP4, WebM) up to 50 MB" },
  audio: {
    mimes: ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/webm", "audio/ogg", "audio/wav", "audio/x-wav"],
    maxBytes: 20 * MB,
    label: "Audio (MP3, M4A, WebM, OGG, WAV) up to 20 MB",
  },
};
export const MAX_MEDIA_PER_TAG = 20;

/** Strips codec parameters: "audio/webm;codecs=opus" -> "audio/webm". */
export function baseMime(mime: string): string {
  return mime.split(";")[0].trim().toLowerCase();
}

export function checkMediaFile(
  mime: string,
  size: number,
): { ok: true; type: MediaType } | { ok: false; error: string } {
  const m = baseMime(mime);
  for (const type of Object.keys(MEDIA_LIMITS) as MediaType[]) {
    const lim = MEDIA_LIMITS[type];
    if (lim.mimes.includes(m)) {
      if (size <= 0) return { ok: false, error: "The file is empty" };
      if (size > lim.maxBytes) return { ok: false, error: `Too big. ${lim.label}` };
      return { ok: true, type };
    }
  }
  return { ok: false, error: "This file type is not supported. Use photos, videos or audio files" };
}

/** Turns a Zod error into { field: message } using the first message per field. */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "_";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

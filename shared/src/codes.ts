export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 8;

function cryptoRandom(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

/** A random 8-character code without look-alike characters (0/O, 1/I/L). */
export function generateCode(random: () => number = cryptoRandom): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return out;
}

/** "7KQ4M2XP" -> "7KQ4 M2XP" */
export function formatCode(code: string): string {
  return `${code.slice(0, 4)} ${code.slice(4)}`;
}

/** Accepts typed codes ("7kq4-m2xp", " 7KQ4 M2XP ") and returns the canonical code, or null. */
export function normalizeCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const c = input.replace(/[\s-]/g, "").toUpperCase();
  if (c.length !== CODE_LENGTH) return null;
  for (const ch of c) if (!CODE_ALPHABET.includes(ch)) return null;
  return c;
}

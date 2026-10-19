export function nextBoxNumber(lastIssued: number): number {
  return lastIssued + 1;
}

export function formatBoxNumber(n: number): string {
  return `BOX ${String(n).padStart(2, "0")}`;
}

export interface SearchableBox {
  id: string;
  title: string;
  room: string | null;
  boxNumber: number | null;
  contents: string[];
}

export interface SearchHit<B extends SearchableBox = SearchableBox> {
  box: B;
  /** Content items that matched (may be empty when only the title or room matched). */
  matches: string[];
}

export function normalizeQuery(q: string): string[] {
  return q.trim().replace(/\s+/g, " ").toLocaleLowerCase().split(" ").filter(Boolean);
}

function matchesAll(text: string, words: string[]): boolean {
  const t = text.toLocaleLowerCase();
  return words.every((w) => t.includes(w));
}

/** "Where is my kettle?" Every word must match within one item, the title or the room. */
export function searchContents<B extends SearchableBox>(boxes: B[], query: string): SearchHit<B>[] {
  const words = normalizeQuery(query);
  if (words.length === 0) return [];
  const hits: SearchHit<B>[] = [];
  for (const box of boxes) {
    const matches = box.contents.filter((item) => matchesAll(item, words));
    if (matches.length > 0 || matchesAll(box.title, words) || (box.room !== null && matchesAll(box.room, words))) {
      hits.push({ box, matches });
    }
  }
  return hits.sort((a, b) => (a.box.boxNumber ?? 0) - (b.box.boxNumber ?? 0));
}

export const NO_ROOM = "No room";

export function groupByRoom<B extends SearchableBox>(boxes: B[]): { room: string; boxes: B[] }[] {
  const map = new Map<string, B[]>();
  for (const b of boxes) {
    const room = b.room ?? NO_ROOM;
    if (!map.has(room)) map.set(room, []);
    map.get(room)!.push(b);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === NO_ROOM ? 1 : b === NO_ROOM ? -1 : a.localeCompare(b)))
    .map(([room, list]) => ({ room, boxes: list.sort((x, y) => (x.boxNumber ?? 0) - (y.boxNumber ?? 0)) }));
}

/** Splits text into parts for highlighting the query words (no HTML). */
export function highlightParts(text: string, query: string): { text: string; hit: boolean }[] {
  const words = normalizeQuery(query);
  if (words.length === 0) return [{ text, hit: false }];
  const lower = text.toLocaleLowerCase();
  const mark = new Array<boolean>(text.length).fill(false);
  for (const w of words) {
    let i = lower.indexOf(w);
    while (i !== -1) {
      for (let k = i; k < i + w.length; k++) mark[k] = true;
      i = lower.indexOf(w, i + 1);
    }
  }
  const parts: { text: string; hit: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = parts[parts.length - 1];
    if (last && last.hit === mark[i]) last.text += text[i];
    else parts.push({ text: text[i], hit: mark[i] });
  }
  return parts;
}

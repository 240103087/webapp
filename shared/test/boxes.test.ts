import { describe, it, expect } from "vitest";
import { nextBoxNumber, formatBoxNumber, searchContents, groupByRoom, highlightParts, type SearchableBox } from "../src/boxes";

const b = (n: number, room: string | null, contents: string[], title = `Box ${n}`): SearchableBox => ({
  id: `b${n}`,
  title,
  room,
  boxNumber: n,
  contents,
});

describe("box numbers", () => {
  it("never reuses numbers", () => {
    expect(nextBoxNumber(0)).toBe(1);
    expect(nextBoxNumber(5)).toBe(6);
  });
  it("formats two digits", () => {
    expect(formatBoxNumber(7)).toBe("BOX 07");
    expect(formatBoxNumber(123)).toBe("BOX 123");
  });
});

describe("searchContents", () => {
  const boxes = [
    b(9, "Kitchen", ["Kettle descaler", "Sponges"]),
    b(7, "Kitchen", ["Electric kettle", "Mugs"]),
    b(3, "Bedroom", ["Blue mugs x4", "Blue blanket", "Mug warmer"]),
    b(4, "Гостиная", ["Шәйнек, 2 л", "Кесе"]),
    b(5, "Office", ["Laptop"], "Fragile monitor"),
  ];
  it("finds case-insensitively and sorts by box number", () => {
    const r = searchContents(boxes, "KETTLE");
    expect(r.map((h) => h.box.boxNumber)).toEqual([7, 9]);
    expect(r[0].matches).toEqual(["Electric kettle"]);
  });
  it("trims and collapses spaces; empty query finds nothing", () => {
    expect(searchContents(boxes, "  kettle   ").length).toBe(2);
    expect(searchContents(boxes, "   ")).toEqual([]);
  });
  it("works with Cyrillic and Kazakh letters", () => {
    expect(searchContents(boxes, "шәйнек")[0].box.boxNumber).toBe(4);
    expect(searchContents(boxes, "КЕСЕ")[0].matches).toEqual(["Кесе"]);
  });
  it("multi-word queries must match within one item", () => {
    const r = searchContents(boxes, "blue mug");
    expect(r).toHaveLength(1);
    expect(r[0].matches).toEqual(["Blue mugs x4"]);
    expect(searchContents(boxes, "blue warmer")).toEqual([]);
  });
  it("matches title and room too", () => {
    expect(searchContents(boxes, "monitor")[0]).toMatchObject({ box: { boxNumber: 5 }, matches: [] });
    expect(searchContents(boxes, "bedroom").map((h) => h.box.boxNumber)).toEqual([3]);
  });
});

describe("groupByRoom", () => {
  it("sorts rooms and boxes, puts no-room last", () => {
    const g = groupByRoom([b(3, "Kitchen", []), b(1, "Bedroom", []), b(2, null, []), b(0, "Kitchen", [])]);
    expect(g.map((x) => x.room)).toEqual(["Bedroom", "Kitchen", "No room"]);
    expect(g[1].boxes.map((x) => x.boxNumber)).toEqual([0, 3]);
  });
});

describe("highlightParts", () => {
  it("marks every query word", () => {
    expect(highlightParts("Electric kettle", "kettle")).toEqual([
      { text: "Electric ", hit: false },
      { text: "kettle", hit: true },
    ]);
    expect(highlightParts("abc", "")).toEqual([{ text: "abc", hit: false }]);
  });
});

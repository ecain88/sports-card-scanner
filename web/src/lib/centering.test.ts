import { describe, it, expect } from "vitest";
import { computeCentering, formatRatio, type Rect } from "./centering";

// Helper: build outer/inner so that each border has an exact pixel width.
function rects(borders: { l: number; r: number; t: number; b: number }, innerW = 100, innerH = 140): { outer: Rect; inner: Rect } {
  const inner: Rect = { left: borders.l, top: borders.t, right: borders.l + innerW, bottom: borders.t + innerH };
  const outer: Rect = {
    left: 0,
    top: 0,
    right: inner.right + borders.r,
    bottom: inner.bottom + borders.b,
  };
  return { outer, inner };
}

describe("computeCentering", () => {
  it("perfect 50/50 -> PSA 10", () => {
    const { outer, inner } = rects({ l: 10, r: 10, t: 10, b: 10 });
    const res = computeCentering(outer, inner);
    expect(res.lr).toEqual({ leftPct: 50, rightPct: 50 });
    expect(res.tb).toEqual({ topPct: 50, bottomPct: 50 });
    expect(res.worstLargerPct).toBe(50);
    expect(res.supportedGrade).toBe(10);
  });

  it("55/45 left/right -> still PSA 10", () => {
    const { outer, inner } = rects({ l: 11, r: 9, t: 10, b: 10 });
    const res = computeCentering(outer, inner);
    expect(res.lr).toEqual({ leftPct: 55, rightPct: 45 });
    expect(res.worstAxis).toBe("leftRight");
    expect(res.worstLargerPct).toBe(55);
    expect(res.supportedGrade).toBe(10);
  });

  it("60/40 -> PSA 9", () => {
    const { outer, inner } = rects({ l: 12, r: 8, t: 10, b: 10 });
    const res = computeCentering(outer, inner);
    expect(res.lr).toEqual({ leftPct: 60, rightPct: 40 });
    expect(res.supportedGrade).toBe(9);
  });

  it("65/35 -> PSA 8", () => {
    const { outer, inner } = rects({ l: 13, r: 7, t: 10, b: 10 });
    const res = computeCentering(outer, inner);
    expect(res.worstLargerPct).toBe(65);
    expect(res.supportedGrade).toBe(8);
  });

  it("worst axis is chosen across L/R and T/B", () => {
    // L/R is 50/50 but T/B is 70/30 -> worst axis is topBottom
    const { outer, inner } = rects({ l: 10, r: 10, t: 14, b: 6 });
    const res = computeCentering(outer, inner);
    expect(res.worstAxis).toBe("topBottom");
    expect(res.tb.topPct).toBe(70);
    expect(res.worstLargerPct).toBe(70);
    expect(res.supportedGrade).toBe(7);
  });

  it("very lopsided centering -> floor grade", () => {
    const { outer, inner } = rects({ l: 19, r: 1, t: 10, b: 10 });
    const res = computeCentering(outer, inner);
    expect(res.worstLargerPct).toBe(95);
    expect(res.supportedGrade).toBe(4);
  });

  it("back side uses looser tolerances", () => {
    const { outer, inner } = rects({ l: 14, r: 6, t: 10, b: 10 }); // 70/30
    const res = computeCentering(outer, inner, "back");
    expect(res.supportedGrade).toBe(10); // 70 <= 75 back tolerance for 10
  });

  it("degenerate zero-size rects do not blow up", () => {
    const zero: Rect = { left: 0, top: 0, right: 0, bottom: 0 };
    const res = computeCentering(zero, zero);
    expect(res.lr).toEqual({ leftPct: 50, rightPct: 50 });
    expect(res.supportedGrade).toBe(10);
  });
});

describe("formatRatio", () => {
  it("puts the larger side first", () => {
    expect(formatRatio(45, 55)).toBe("55/45");
    expect(formatRatio(60, 40)).toBe("60/40");
    expect(formatRatio(50, 50)).toBe("50/50");
  });
});

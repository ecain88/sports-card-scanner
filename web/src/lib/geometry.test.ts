import { describe, it, expect } from "vitest";
import { orderCorners, rectFromCorners, maxDimensions, isLikelyBorderless, type Point } from "./geometry";

describe("orderCorners", () => {
  it("orders scrambled corners as TL, TR, BR, BL", () => {
    const scrambled: Point[] = [
      { x: 100, y: 0 }, // TR
      { x: 0, y: 0 }, // TL
      { x: 0, y: 140 }, // BL
      { x: 100, y: 140 }, // BR
    ];
    const [tl, tr, br, bl] = orderCorners(scrambled);
    expect(tl).toEqual({ x: 0, y: 0 });
    expect(tr).toEqual({ x: 100, y: 0 });
    expect(br).toEqual({ x: 100, y: 140 });
    expect(bl).toEqual({ x: 0, y: 140 });
  });

  it("handles a slightly rotated quad", () => {
    const rotated: Point[] = [
      { x: 12, y: 2 }, // TL-ish
      { x: 110, y: 10 }, // TR-ish
      { x: 102, y: 150 }, // BR-ish
      { x: 4, y: 142 }, // BL-ish
    ];
    const [tl, tr, br, bl] = orderCorners(rotated);
    expect(tl).toEqual({ x: 12, y: 2 });
    expect(tr).toEqual({ x: 110, y: 10 });
    expect(br).toEqual({ x: 102, y: 150 });
    expect(bl).toEqual({ x: 4, y: 142 });
  });

  it("throws if not given 4 points", () => {
    expect(() => orderCorners([{ x: 0, y: 0 }])).toThrow();
  });
});

describe("rectFromCorners", () => {
  it("computes the axis-aligned bounding rect", () => {
    const r = rectFromCorners([
      { x: 5, y: 8 },
      { x: 100, y: 3 },
      { x: 98, y: 140 },
      { x: 2, y: 138 },
    ]);
    expect(r).toEqual({ left: 2, top: 3, right: 100, bottom: 140 });
  });
});

describe("maxDimensions", () => {
  it("returns width/height of the largest opposing sides", () => {
    const dims = maxDimensions([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 140 },
      { x: 0, y: 140 },
    ]);
    expect(dims).toEqual({ width: 100, height: 140 });
  });
});

describe("isLikelyBorderless", () => {
  it("flags a card whose inner frame fills almost the whole card", () => {
    const outer = { left: 0, top: 0, right: 100, bottom: 140 };
    const inner = { left: 0.5, top: 0.5, right: 99.5, bottom: 139.5 };
    expect(isLikelyBorderless(outer, inner)).toBe(true);
  });

  it("does not flag a normal bordered card", () => {
    const outer = { left: 0, top: 0, right: 100, bottom: 140 };
    const inner = { left: 8, top: 10, right: 92, bottom: 130 };
    expect(isLikelyBorderless(outer, inner)).toBe(false);
  });
});

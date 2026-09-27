import { describe, expect, it } from "vitest";

import {
  compositeOver,
  contrastRatio,
  mixColors,
  parseHexColor,
  relativeLuminance,
} from "@/lib/contrast";

const white = parseHexColor("#ffffff");
const black = parseHexColor("#000000");

describe("contrast utility", () => {
  it("parses 6- and 3-digit hex", () => {
    expect(parseHexColor("#e2553d")).toEqual({ r: 226, g: 85, b: 61 });
    expect(parseHexColor("fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(() => parseHexColor("red")).toThrow();
  });

  it("computes relative luminance at the extremes", () => {
    expect(relativeLuminance(white)).toBeCloseTo(1, 5);
    expect(relativeLuminance(black)).toBeCloseTo(0, 5);
  });

  it("matches known WCAG reference ratios", () => {
    expect(contrastRatio(black, white)).toBeCloseTo(21, 5);
    expect(contrastRatio(white, white)).toBeCloseTo(1, 5);
    // #767676 is the classic lightest gray that passes AA on white.
    expect(contrastRatio(parseHexColor("#767676"), white)).toBeCloseTo(4.54, 2);
    expect(contrastRatio(parseHexColor("#777777"), white)).toBeLessThan(4.5);
  });

  it("is symmetric", () => {
    const a = parseHexColor("#1a1614");
    const b = parseHexColor("#e2553d");
    expect(contrastRatio(a, b)).toBe(contrastRatio(b, a));
  });

  it("composites translucent colors the way the browser paints them", () => {
    expect(compositeOver({ ...black, a: 0.5 }, white)).toEqual({ r: 127.5, g: 127.5, b: 127.5 });
    expect(compositeOver({ ...black, a: 0 }, white)).toEqual(white);
    expect(mixColors(black, white, 1)).toEqual(black);
  });

  it("reproduces the audit's measured failures (translucent text over bands)", () => {
    const cream = parseHexColor("#faf6ef");
    const tomato = parseHexColor("#e2553d");
    // Cream at 70% over tomato — the old balance line — measured 2.43:1 in the audit.
    const seventyPercentCream = compositeOver({ ...cream, a: 0.7 }, tomato);
    expect(contrastRatio(seventyPercentCream, tomato)).toBeCloseTo(2.43, 1);
    // Full cream on tomato — band 1's old small text — measured 3.48:1.
    expect(contrastRatio(cream, tomato)).toBeCloseTo(3.48, 2);
  });
});

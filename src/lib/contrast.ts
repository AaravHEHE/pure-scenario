export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Rgba extends Rgb {
  /** 0 (transparent) to 1 (opaque). */
  a: number;
}

export const WCAG_AA_NORMAL_TEXT = 4.5;

export function parseHexColor(hex: string): Rgb {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match?.[1]) throw new Error(`Not a hex color: "${hex}"`);
  const digits =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((d) => d + d)
          .join("")
      : match[1];
  return {
    r: parseInt(digits.slice(0, 2), 16),
    g: parseInt(digits.slice(2, 4), 16),
    b: parseInt(digits.slice(4, 6), 16),
  };
}

function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** WCAG contrast ratio between two opaque colors, 1 to 21. Order doesn't matter. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Linear sRGB-space mix, matching CSS `color-mix(in srgb, a <weight>, b)` for opaque colors. */
export function mixColors(a: Rgb, b: Rgb, weightOfA: number): Rgb {
  const mix = (x: number, y: number) => x * weightOfA + y * (1 - weightOfA);
  return { r: mix(a.r, b.r), g: mix(a.g, b.g), b: mix(a.b, b.b) };
}

/** The opaque color a browser paints when `top` (possibly translucent) sits over `bottom`. */
export function compositeOver(top: Rgba, bottom: Rgb): Rgb {
  return mixColors(top, bottom, top.a);
}

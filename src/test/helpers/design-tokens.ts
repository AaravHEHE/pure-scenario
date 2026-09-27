import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { mixColors, parseHexColor, type Rgba } from "@/lib/contrast";

// Reads custom properties straight from styles.css, so tests check what the
// stylesheet actually defines rather than a copy of it. Read from disk because
// Vitest stubs CSS imports (including ?raw) to an empty string.
// Vitest runs from the project root (where vitest.config.ts lives).
const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
const declarations = new Map<string, string>();
for (const match of css.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
  const [, name, value] = match;
  if (name && value && !declarations.has(name)) declarations.set(name, value.trim());
}

export const BAND_COLORS = ["tomato", "mustard", "forest", "slate", "clay"] as const;
export type BandColor = (typeof BAND_COLORS)[number];

export function hasToken(name: string): boolean {
  return declarations.has(name);
}

export function resolveToken(name: string, seen: string[] = []): Rgba {
  if (seen.includes(name)) throw new Error(`Circular token: ${[...seen, name].join(" -> ")}`);
  const value = declarations.get(name);
  if (value === undefined) throw new Error(`Token --${name} is not defined in styles.css`);
  return resolveValue(value, [...seen, name]);
}

function splitTopLevelArgs(args: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of args) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current.trim());
  return parts;
}

function resolveValue(raw: string, seen: string[]): Rgba {
  const value = raw.trim();
  if (value === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  if (value.startsWith("#")) return { ...parseHexColor(value), a: 1 };

  const varMatch = /^var\(--([a-z0-9-]+)\)$/.exec(value);
  if (varMatch?.[1]) return resolveToken(varMatch[1], seen);

  const rgbMatch = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/.exec(value);
  if (rgbMatch) {
    const [, r, g, b, alpha, pct] = rgbMatch;
    const a = alpha === undefined ? 1 : Number(alpha) / (pct ? 100 : 1);
    return { r: Number(r), g: Number(g), b: Number(b), a };
  }

  const mixMatch = /^color-mix\(\s*in srgb\s*,(.*)\)$/.exec(value);
  if (mixMatch?.[1]) {
    const [first, second] = splitTopLevelArgs(mixMatch[1]);
    const parse = (arg: string) => {
      const m = /^(.*?)\s+([\d.]+)%$/.exec(arg);
      return m?.[1] && m[2]
        ? { color: resolveValue(m[1], seen), weight: Number(m[2]) / 100 }
        : { color: resolveValue(arg, seen), weight: undefined };
    };
    const a = parse(first ?? "");
    const b = parse(second ?? "");
    const wa = a.weight ?? 1 - (b.weight ?? 0.5);
    // Premultiplied interpolation, as the CSS spec defines color-mix().
    const alpha = a.color.a * wa + b.color.a * (1 - wa);
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
    const share = (a.color.a * wa) / alpha;
    return { ...mixColors(a.color, b.color, share), a: alpha };
  }

  throw new Error(`Unsupported color value in styles.css: "${value}"`);
}

/** Resolves a Tailwind color utility like `text-on-tomato` or `border-on-locked/40`. */
export function resolveColorClass(
  className: string,
  prefix: "text" | "bg" | "border",
): { token: string; color: Rgba; hasAlphaModifier: boolean } | null {
  const m = new RegExp(`^${prefix}-([a-z0-9-]+?)(?:/(\\d+))?$`).exec(className);
  if (!m?.[1] || !hasToken(`color-${m[1]}`)) return null;
  const color = resolveToken(`color-${m[1]}`);
  const alphaModifier = m[2] === undefined ? 1 : Number(m[2]) / 100;
  return { token: m[1], color: { ...color, a: color.a * alphaModifier }, hasAlphaModifier: !!m[2] };
}

/** The text color an element renders with: its own `text-*` color class, else the nearest ancestor's. */
export function resolvedTextColor(el: Element) {
  for (let node: Element | null = el; node; node = node.parentElement) {
    for (const cls of Array.from(node.classList)) {
      const hit = resolveColorClass(cls, "text");
      if (hit) return { ...hit, from: node };
    }
  }
  throw new Error(`No text color class on ${el.outerHTML.slice(0, 80)} or its ancestors`);
}

/** Every `opacity-*` class on the element and its ancestors. */
export function opacityClassesOnPath(el: Element): string[] {
  const found: string[] = [];
  for (let node: Element | null = el; node; node = node.parentElement) {
    found.push(...Array.from(node.classList).filter((c) => /^opacity-/.test(c)));
  }
  return found;
}

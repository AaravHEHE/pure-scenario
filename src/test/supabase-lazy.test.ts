import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Follows static imports (not `import type`, not dynamic `import()`) from the
// client's startup entry points, to prove supabase-js is not in the startup
// bundle. The production build is the real proof; this keeps it from
// regressing, e.g. if a generated Supabase file is regenerated with a
// top-level import again.
const SRC = resolve(process.cwd(), "src");
const ENTRY_POINTS = ["start.ts", "router.tsx"];
const SUPABASE_CLIENT = resolve(SRC, "integrations/supabase/client.ts");

const STATIC_IMPORT = /^\s*(?:import|export)\s+(?!type\b)(?:[^'"]*?\sfrom\s+)?["']([^"']+)["']/gm;

function resolveLocal(from: string, specifier: string): string | null {
  const base = specifier.startsWith("@/")
    ? resolve(SRC, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(from), specifier)
      : null;
  if (!base) return null;
  const clean = base.replace(/\?.*$/, "");
  for (const candidate of [
    clean,
    `${clean}.ts`,
    `${clean}.tsx`,
    `${clean}/index.ts`,
    `${clean}/index.tsx`,
  ]) {
    if (existsSync(candidate) && !candidate.endsWith("/") && /\.(ts|tsx)$/.test(candidate))
      return candidate;
  }
  return null;
}

function staticImportGraph(entries: string[]) {
  const files = new Set<string>();
  const packages = new Map<string, string>(); // package -> first importer
  const queue = entries.map((entry) => resolve(SRC, entry));
  while (queue.length) {
    const file = queue.pop()!;
    if (files.has(file)) continue;
    files.add(file);
    const source = readFileSync(file, "utf8");
    for (const [, specifier] of source.matchAll(STATIC_IMPORT)) {
      const local = resolveLocal(file, specifier!);
      if (local) queue.push(local);
      else if (
        !specifier!.startsWith(".") &&
        !specifier!.startsWith("@/") &&
        !packages.has(specifier!)
      ) {
        packages.set(specifier!, file.replace(`${SRC}/`, "src/"));
      }
    }
  }
  return { files, packages };
}

describe("Supabase is lazy-loaded, not part of startup", () => {
  const { files, packages } = staticImportGraph(ENTRY_POINTS);

  it("walks the real app (sanity check on the walker)", () => {
    expect(files.has(resolve(SRC, "routes/__root.tsx"))).toBe(true);
    expect(files.has(resolve(SRC, "routes/leaderboard.tsx"))).toBe(true);
    expect(files.has(resolve(SRC, "integrations/supabase/auth-attacher.ts"))).toBe(true);
    expect(packages.has("@tanstack/react-router")).toBe(true);
  });

  it("no startup module statically imports supabase-js or the Supabase client", () => {
    expect(
      packages.get("@supabase/supabase-js"),
      "supabase-js is statically imported by this file",
    ).toBeUndefined();
    expect(files.has(SUPABASE_CLIENT)).toBe(false);
  });

  it("the client is still reachable on demand through loadSupabase()", async () => {
    const { loadSupabase } = await import("@/lib/supabase");
    const module = await loadSupabase();
    expect(module).toHaveProperty("supabase");
  });
});

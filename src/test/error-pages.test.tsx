import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import { contrastRatio, WCAG_AA_NORMAL_TEXT } from "@/lib/contrast";
import { renderErrorPage } from "@/lib/error-page";
import { Route as RootRoute } from "@/routes/__root";
import { hasToken, resolveColorClass, resolveToken } from "@/test/helpers/design-tokens";

// Vitest stubs CSS imports to "", so give the stylesheet URL a recognizable value.
vi.mock("@/styles.css?url", () => ({ default: "/assets/app-styles.css" }));

function renderAt(path: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appRoot = RootRoute.options as any;
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
    notFoundComponent: appRoot.notFoundComponent,
    errorComponent: appRoot.errorComponent,
  });
  const home = createRoute({ getParentRoute: () => rootRoute, path: "/", component: () => null });
  const boom = createRoute({
    getParentRoute: () => rootRoute,
    path: "/boom",
    component: () => {
      throw new Error("boom");
    },
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([home, boom]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return render(<RouterProvider router={router as any} />);
}

const SEMANTIC_SLOT =
  /^(bg|text|border)-(primary|secondary|muted|accent|destructive|card|popover|input|ring|background|foreground)(-foreground)?(\/\d+)?$/;

/** Every shadcn semantic color class on the page must map to a real palette token. */
function expectSemanticClassesResolve(container: HTMLElement) {
  const unresolved: string[] = [];
  let checked = 0;
  for (const el of Array.from(container.querySelectorAll("*"))) {
    for (const raw of Array.from(el.classList)) {
      const cls = raw.replace(/^[a-z-]+:/, "");
      if (!SEMANTIC_SLOT.test(cls)) continue;
      checked++;
      const prefix = cls.split("-")[0] as "bg" | "text" | "border";
      if (!resolveColorClass(cls, prefix)) unresolved.push(raw);
    }
  }
  expect(checked).toBeGreaterThan(0);
  expect(unresolved).toEqual([]);
}

function expectNoFakeBold(container: HTMLElement) {
  for (const heading of Array.from(container.querySelectorAll("h1, h2, h3"))) {
    expect(
      heading.className,
      `${heading.textContent} requests a weight Instrument Serif lacks`,
    ).not.toMatch(/\bfont-(medium|semibold|bold|extrabold|black)\b/);
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("404 page", () => {
  it("renders without throwing, on real palette tokens, without fake bold", async () => {
    const { container } = renderAt("/definitely-not-a-page");
    expect(await screen.findByText("404")).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
    expectSemanticClassesResolve(container);
    expectNoFakeBold(container);
  });
});

describe("route error page", () => {
  it("renders without throwing, on real palette tokens, without fake bold", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = renderAt("/boom");
    expect(await screen.findByText("This page didn't load")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
    expectSemanticClassesResolve(container);
    expectNoFakeBold(container);
  });
});

describe("shadcn semantic slots map onto the palette", () => {
  it.each([
    ["primary-foreground", "primary"],
    ["secondary-foreground", "secondary"],
    ["muted-foreground", "background"],
    ["accent-foreground", "accent"],
    ["destructive-foreground", "destructive"],
    ["card-foreground", "card"],
    ["popover-foreground", "popover"],
    ["foreground", "background"],
  ])("%s on %s is opaque and passes AA", (fg, bg) => {
    const f = resolveToken(fg);
    const b = resolveToken(bg);
    expect(f.a).toBe(1);
    expect(b.a).toBe(1);
    expect(contrastRatio(f, b)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
  });
});

describe("crash fallback page (renderErrorPage)", () => {
  const html = renderErrorPage();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const style = doc.querySelector("style")?.textContent ?? "";

  it("is a complete document that parses", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(doc.querySelector("h1")?.textContent).toBe("This page didn't load");
    expect(doc.querySelector("button")?.textContent).toBe("Try again");
    expect(doc.querySelector("a")?.getAttribute("href")).toBe("/");
  });

  it("uses the design tokens, not hardcoded colors or system fonts", () => {
    expect(style).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(style).not.toMatch(/system-ui/);
    const used = [...style.matchAll(/var\(--([a-z0-9-]+)\)/g)].map((m) => m[1]!);
    expect(used).toEqual(expect.arrayContaining(["base", "ink", "font-sans", "font-display"]));
    for (const name of used) expect(hasToken(name), `--${name} is not defined`).toBe(true);
  });

  it("links the app stylesheet that defines those tokens", () => {
    const sheets = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map((l) =>
      l.getAttribute("href"),
    );
    expect(sheets).toContain("/assets/app-styles.css");
  });
});

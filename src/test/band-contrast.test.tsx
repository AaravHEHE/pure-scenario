import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { compositeOver, contrastRatio, WCAG_AA_NORMAL_TEXT } from "@/lib/contrast";
import {
  BAND_COLORS,
  hasToken,
  opacityClassesOnPath,
  resolveColorClass,
  resolvedTextColor,
  resolveToken,
} from "@/test/helpers/design-tokens";

const game = vi.hoisted(() => ({ balance: 0, unlocked: false }));

vi.mock("@/hooks/use-game-data", () => ({
  useBalance: () => ({ data: game.balance }),
  useIsScenarioUnlocked: () => game.unlocked,
  useAttemptScenario: () => ({ mutateAsync: async () => {} }),
  useRecordScenarioResult: () => ({ mutateAsync: async () => {} }),
  useUnlockScenario: () => ({ mutateAsync: async () => {} }),
}));

import { BalanceChip } from "@/components/scenario-bands/balance-chip";
import { CardSuitBand } from "@/components/scenario-bands/card-suit-band";
import { CoinFlipBand } from "@/components/scenario-bands/coin-flip-band";

beforeEach(() => {
  game.balance = 0;
  game.unlocked = false;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

const opaque = (c: { r: number; g: number; b: number }) => ({ r: c.r, g: c.g, b: c.b });

describe.each(BAND_COLORS)("%s band — every text pairing meets WCAG AA (4.5:1)", (band) => {
  const bandColor = resolveToken(band);

  it("defines its own text color token, and that color passes on the band", () => {
    expect(hasToken(`on-${band}`), `--on-${band} missing from styles.css`).toBe(true);
    const text = resolveToken(`on-${band}`);
    expect(text.a).toBe(1);
    expect(contrastRatio(opaque(text), opaque(bandColor))).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL_TEXT,
    );
  });

  it("balance chip: opaque text on an opaque chip, regardless of the band beneath", () => {
    const { container } = render(<BalanceChip balance={42} />);
    const chip = container.querySelector("p")!;
    const classes = Array.from(chip.classList);
    const bg = classes.map((c) => resolveColorClass(c, "bg")).find(Boolean)!;
    const text = classes.map((c) => resolveColorClass(c, "text")).find(Boolean)!;

    expect(bg, "chip has no background color class").toBeTruthy();
    expect(bg.hasAlphaModifier || bg.color.a < 1, "chip background must be opaque").toBe(false);
    expect(text.hasAlphaModifier || text.color.a < 1, "chip text must be opaque").toBe(false);
    expect(opacityClassesOnPath(chip)).toEqual([]);

    const chipOnBand = compositeOver(bg.color, opaque(bandColor));
    const painted = compositeOver(text.color, chipOnBand);
    expect(contrastRatio(painted, chipOnBand)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
  });

  it("locked state: opaque text over the scrim-dimmed band", () => {
    const dimmed = compositeOver(resolveToken("locked-scrim"), opaque(bandColor));
    const text = resolveToken("on-locked");
    expect(text.a).toBe(1);
    expect(contrastRatio(opaque(text), dimmed)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
  });
});

describe("locked band (card suit) renders its dimming with the scrim, not faded text", () => {
  it.each([
    ["unaffordable", 10],
    ["affordable", 30],
  ])("price, label and balance are opaque and pass AA (%s)", (_, balance) => {
    game.balance = balance;
    const { container } = render(<CardSuitBand />);
    const section = container.querySelector("section")!;
    const bandColor = Array.from(section.classList)
      .map((c) => resolveColorClass(c, "bg"))
      .find(Boolean)!.color;
    const scrim = container.querySelector(".bg-locked-scrim");
    expect(scrim, "locked band should dim via the scrim overlay").toBeTruthy();
    const dimmed = compositeOver(resolveToken("locked-scrim"), opaque(bandColor));

    const price = screen.getByRole("button", { name: /unlock for 25 points/i });
    for (const el of [
      price,
      screen.getByText("Locked"),
      screen.getByText("Scenario 3"),
      screen.getByText(/card suit · 1\/4 odds/i),
    ]) {
      const text = resolvedTextColor(el);
      expect(text.hasAlphaModifier, `${el.textContent} uses a translucent text color`).toBe(false);
      expect(opacityClassesOnPath(el), `${el.textContent} is faded with opacity`).toEqual([]);
      expect(contrastRatio(opaque(text.color), dimmed)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    }
    // Disabled or not, the price never fades.
    expect(price.className).not.toMatch(/(^|\s)disabled:opacity-/);
    expect(screen.getByText(`Balance: ${balance}`).closest("p")!.className).toContain("bg-base");
  });
});

describe("band 1 (coin flip) small text uses the ink token", () => {
  const ink = resolveToken("ink");

  it("subtitle, pick buttons and result message resolve to ink, not cream", async () => {
    render(<CoinFlipBand />);
    const expectInk = (el: Element) => {
      const text = resolvedTextColor(el);
      expect(opaque(text.color), `"${el.textContent}" resolved to --${text.token}`).toEqual(
        opaque(ink),
      );
    };

    expectInk(screen.getByText(/coin flip · 1\/2 odds · 1 point/i));
    expectInk(screen.getByRole("button", { name: "Heads" }));
    expectInk(screen.getByRole("button", { name: "Tails" }));

    fireEvent.click(screen.getByRole("button", { name: "Heads" }));
    // The selected pick inverts to band-colored text on an ink fill; that must pass too.
    const selected = screen.getByRole("button", { name: "Heads" });
    const selectedBg = Array.from(selected.classList)
      .map((c) => resolveColorClass(c, "bg"))
      .find(Boolean)!;
    expect(
      contrastRatio(opaque(resolvedTextColor(selected).color), opaque(selectedBg.color)),
    ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^flip$/i }));
    });
    expectInk(screen.getByText(/^You (won|lost)/));
  });

  it("the ink it resolves to passes AA on tomato, where cream did not", () => {
    const tomato = opaque(resolveToken("tomato"));
    expect(contrastRatio(opaque(resolveToken("on-tomato")), tomato)).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL_TEXT,
    );
    expect(contrastRatio(opaque(resolveToken("base")), tomato)).toBeLessThan(WCAG_AA_NORMAL_TEXT);
  });
});

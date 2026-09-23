import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const rng = vi.hoisted(() => ({ coin: "heads" as "heads" | "tails", suit: "hearts" as string }));

vi.mock("@/lib/coin-flip", () => ({ flipCoin: () => rng.coin }));
vi.mock("@/lib/card-suit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/card-suit")>()),
  drawSuit: () => rng.suit,
}));
vi.mock("@/hooks/use-game-data", () => ({
  useBalance: () => ({ data: 100 }),
  useIsScenarioUnlocked: () => true,
  useAttemptScenario: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) }),
  useRecordScenarioResult: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) }),
  useUnlockScenario: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) }),
}));

import { CoinFlipBand } from "@/components/scenario-bands/coin-flip-band";
import { CardSuitBand } from "@/components/scenario-bands/card-suit-band";

beforeEach(() => {
  vi.useFakeTimers();
  // Motion ON — this is the path the old tests never exercised.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  vi.useRealTimers();
});

function getFaces(container: HTMLElement) {
  const front = container.querySelector<HTMLElement>('[data-face="front"]');
  const back = container.querySelector<HTMLElement>('[data-face="back"]');
  if (!front || !back) throw new Error("expected both a front and a back face");
  const spinner = front.parentElement as HTMLElement;
  return { front, back, spinner };
}

function rotationOf(spinner: HTMLElement): number {
  const match = /rotateY\((-?\d+)deg\)/.exec(spinner.style.transform);
  if (!match?.[1]) throw new Error(`no rotateY in "${spinner.style.transform}"`);
  return Number(match[1]);
}

/** The face turned toward the viewer: rotation of 0 (mod 360) shows the front, 180 the back. */
function visibleFace(container: HTMLElement): HTMLElement {
  const { front, back, spinner } = getFaces(container);
  const r = ((rotationOf(spinner) % 360) + 360) % 360;
  if (r === 0) return front;
  if (r === 180) return back;
  throw new Error(`coin/card resting at an edge-on angle: ${r}deg`);
}

async function playOnce(
  pickName: string,
  actionName: RegExp,
  againName: RegExp,
  durationMs: number,
): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: pickName }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: actionName }));
  });
  await act(async () => {
    vi.advanceTimersByTime(durationMs);
  });
  expect(screen.getByRole("button", { name: againName })).toBeInTheDocument();
}

describe.each([
  {
    name: "CoinFlipBand",
    Band: CoinFlipBand,
    thicknessHalf: 4,
    idlePrompt: "Pick a side",
    pickName: "Heads",
    pickedText: "Picked: Heads",
    action: /^flip$/i,
    again: /flip again/i,
    setOutcome: (i: number) => {
      rng.coin = i % 2 === 0 ? "heads" : "tails";
      return rng.coin === "heads" ? "Heads" : "Tails";
    },
  },
  {
    name: "CardSuitBand",
    Band: CardSuitBand,
    thicknessHalf: 2,
    idlePrompt: "Pick a suit",
    pickName: "Hearts",
    pickedText: "Picked: Hearts",
    action: /^draw \(/i,
    again: /draw again/i,
    setOutcome: (i: number) => {
      rng.suit = ["hearts", "spades", "clubs"][i % 3] as string;
      return rng.suit[0]!.toUpperCase() + rng.suit.slice(1);
    },
  },
])(
  "$name — two-sided reveal (bug 1)",
  ({ Band, thicknessHalf, idlePrompt, pickName, pickedText, action, again, setOutcome }) => {
    it("has two faces 180deg apart, both with hidden backfaces, inside a preserve-3d spinner", () => {
      const { container } = render(<Band />);
      const { front, back, spinner } = getFaces(container);

      expect(spinner.style.transformStyle).toBe("preserve-3d");
      expect(front.style.backfaceVisibility).toBe("hidden");
      expect(back.style.backfaceVisibility).toBe("hidden");
      // Identical placement except the back is turned 180deg; they sit on opposite
      // sides of the thickness so the object has volume mid-spin.
      expect(front.style.transform).toBe(`translateZ(${thicknessHalf}px)`);
      expect(back.style.transform).toBe(`rotateY(180deg) translateZ(${thicknessHalf}px)`);
    });

    it("shows the idle prompt, right-reading, on the face toward the viewer", () => {
      const { container } = render(<Band />);
      expect(visibleFace(container)).toBe(getFaces(container).front);
      expect(visibleFace(container).textContent).toBe(idlePrompt);
    });

    it("lands on the result, right-reading, and never leaks it mid-spin", async () => {
      const { container } = render(<Band />);
      const label = setOutcome(1);

      fireEvent.click(screen.getByRole("button", { name: pickName }));
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: action }));
      });
      const { back, spinner } = getFaces(container);
      expect(spinner.className).toContain("transition-transform");
      // Mid-spin both faces carry only the pick — the outcome isn't on screen yet.
      expect(back.textContent).toBe(pickedText);

      await act(async () => {
        vi.advanceTimersByTime(900);
      });
      expect(visibleFace(container)).toBe(back);
      expect(back.textContent).toContain(label);
      expect(back.getAttribute("aria-hidden")).toBe("false");
      expect(getFaces(container).front.getAttribute("aria-hidden")).toBe("true");
    });

    it("normalizes rotation: every attempt spins 0 -> 1980deg, and idle is back at 0 with no transition", async () => {
      const { container } = render(<Band />);
      const resultRotations: number[] = [];

      for (let i = 0; i < 4; i++) {
        const label = setOutcome(i);
        expect(rotationOf(getFaces(container).spinner)).toBe(0);
        await playOnce(pickName, action, again, 900);
        resultRotations.push(rotationOf(getFaces(container).spinner));
        expect(visibleFace(container).textContent).toContain(label);

        fireEvent.click(screen.getByRole("button", { name: again }));
        const { spinner, front } = getFaces(container);
        expect(rotationOf(spinner)).toBe(0);
        expect(spinner.className).not.toContain("transition-transform");
        // The idle prompt never inherits a leftover rotation from the last result.
        expect(visibleFace(container)).toBe(front);
        expect(front.textContent).toBe(idlePrompt);
      }

      expect(resultRotations).toEqual([1980, 1980, 1980, 1980]);
    });
  },
);

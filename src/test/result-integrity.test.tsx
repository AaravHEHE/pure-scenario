import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const rng = vi.hoisted(() => ({
  coin: "heads" as "heads" | "tails",
  suit: "clubs" as string,
  throw: "scissors" as string,
}));
const calls = vi.hoisted(() => ({
  attempt: [] as unknown[],
  record: [] as unknown[],
}));

vi.mock("@/lib/coin-flip", () => ({ flipCoin: () => rng.coin }));
vi.mock("@/lib/card-suit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/card-suit")>()),
  drawSuit: () => rng.suit,
}));
vi.mock("@/lib/rock-paper-scissors", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rock-paper-scissors")>()),
  randomThrow: () => rng.throw,
}));
vi.mock("@/hooks/use-game-data", () => ({
  useBalance: () => ({ data: 100 }),
  useIsScenarioUnlocked: () => true,
  useAttemptScenario: () => ({
    mutateAsync: async (args: unknown) => {
      calls.attempt.push(args);
    },
  }),
  useRecordScenarioResult: () => ({
    mutateAsync: async (args: unknown) => {
      calls.record.push(args);
    },
  }),
  useUnlockScenario: () => ({ mutateAsync: async () => {} }),
}));

import { CoinFlipBand } from "@/components/scenario-bands/coin-flip-band";
import { CardSuitBand } from "@/components/scenario-bands/card-suit-band";
import { RockPaperScissorsBand } from "@/components/scenario-bands/rock-paper-scissors-band";

beforeEach(() => {
  calls.attempt.length = 0;
  calls.record.length = 0;
  // Reduced motion: results resolve synchronously, so each step is deterministic.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

async function click(name: string | RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

const message = () => screen.getByText(/^You (won|lost)/).textContent;

interface Snapshot {
  message: string | null;
  shown: string | null;
  pressed: string[];
  attempts: number;
  records: number;
}

describe("Changing the pick after a result never rewrites that result (bug 2)", () => {
  it("coin flip: display, win/loss and payout stay pinned to the played flip", async () => {
    const { container } = render(<CoinFlipBand />);
    const back = () => container.querySelector('[data-face="back"]')!.textContent;
    const snapshot = (): Snapshot => ({
      message: message(),
      shown: back(),
      pressed: screen.getAllByRole("button", { pressed: true }).map((b) => b.textContent ?? ""),
      attempts: calls.attempt.length,
      records: calls.record.length,
    });

    rng.coin = "heads";
    await click("Heads");
    await click(/^flip$/i);
    expect(message()).toBe("You won — +1 point");
    expect(calls.record).toEqual([{ scenarioKey: "coin-flip", won: true, points: 1 }]);
    const before = snapshot();

    const tails = screen.getByRole("button", { name: "Tails" });
    expect(tails).toBeDisabled();
    await click("Tails");

    expect(snapshot()).toEqual(before);
    expect(before).toMatchObject({ shown: "Heads", pressed: ["Heads"], attempts: 1, records: 1 });

    // Only a real new flip produces a new outcome and a new payout.
    await click(/flip again/i);
    await click("Tails");
    await click(/^flip$/i);
    expect(message()).toBe("You lost");
    expect(back()).toBe("Heads");
    expect(calls.attempt).toHaveLength(2);
    expect(calls.record[1]).toEqual({ scenarioKey: "coin-flip", won: false, points: 0 });
  });

  it("card suit: display, win/loss and payout stay pinned to the played draw", async () => {
    const { container } = render(<CardSuitBand />);
    const back = () => container.querySelector('[data-face="back"]')!.textContent;
    const snapshot = (): Snapshot => ({
      message: message(),
      shown: back(),
      pressed: screen.getAllByRole("button", { pressed: true }).map((b) => b.textContent ?? ""),
      attempts: calls.attempt.length,
      records: calls.record.length,
    });

    rng.suit = "clubs";
    await click("Clubs");
    await click(/^draw \(/i);
    expect(message()).toBe("You won — +4 points");
    expect(calls.record).toEqual([{ scenarioKey: "card-suit", won: true, points: 4 }]);
    const before = snapshot();

    const spades = screen.getByRole("button", { name: "Spades" });
    expect(spades).toBeDisabled();
    await click("Spades");

    expect(snapshot()).toEqual(before);
    expect(before).toMatchObject({ shown: "Clubs", pressed: ["Clubs"], attempts: 1, records: 1 });

    await click(/draw again/i);
    await click("Spades");
    await click(/^draw \(/i);
    expect(message()).toBe("You lost");
    expect(back()).toBe("Clubs");
    expect(calls.attempt).toEqual([
      { scenarioKey: "card-suit", cost: 4 },
      { scenarioKey: "card-suit", cost: 4 },
    ]);
    expect(calls.record[1]).toEqual({ scenarioKey: "card-suit", won: false, points: 0 });
  });

  it("rock paper scissors: the 'You' throw, win/loss and payout stay pinned to the played throw", async () => {
    render(<RockPaperScissorsBand />);
    const you = () => screen.getByText("You").nextElementSibling!.textContent;
    const rngShown = () => screen.getByText("RNG").nextElementSibling!.textContent;
    const snapshot = (): Snapshot => ({
      message: message(),
      shown: `${you()} vs ${rngShown()}`,
      pressed: screen.getAllByRole("button", { pressed: true }).map((b) => b.textContent ?? ""),
      attempts: calls.attempt.length,
      records: calls.record.length,
    });

    rng.throw = "scissors";
    await click("Rock");
    await click(/^throw$/i);
    expect(message()).toBe("You won — +2 points");
    expect(calls.record).toEqual([{ scenarioKey: "rock-paper-scissors", won: true, points: 2 }]);
    const before = snapshot();

    const paper = screen.getByRole("button", { name: "Paper" });
    expect(paper).toBeDisabled();
    await click("Paper");

    expect(snapshot()).toEqual(before);
    expect(before).toMatchObject({
      shown: "Rock vs Scissors",
      pressed: ["Rock"],
      attempts: 1,
      records: 1,
    });

    await click(/throw again/i);
    await click("Paper");
    await click(/^throw$/i);
    expect(message()).toBe("You lost");
    expect(you()).toBe("Paper");
    expect(calls.attempt).toHaveLength(2);
    expect(calls.record[1]).toEqual({ scenarioKey: "rock-paper-scissors", won: false, points: 0 });
  });
});

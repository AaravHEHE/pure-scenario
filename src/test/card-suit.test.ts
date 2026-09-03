import { describe, expect, it } from "vitest";

import { drawSuit, SUITS, type Suit } from "@/lib/card-suit";
import { applyAttempt, applyResult, type ScoringState } from "@/lib/scoring";
import { SCENARIOS } from "@/lib/scenarios";

describe("drawSuit", () => {
  it("only ever returns one of the four suits", () => {
    for (let i = 0; i < 500; i++) {
      expect(SUITS).toContain(drawSuit());
    }
  });

  it("is a reasonably uniform draw over many trials (~1/4 per suit)", () => {
    const trials = 8000;
    const counts: Record<Suit, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
    for (let i = 0; i < trials; i++) {
      counts[drawSuit()] += 1;
    }

    // Not asserting exactly 1/4 each given randomness — just that no suit is biased.
    for (const suit of SUITS) {
      const ratio = counts[suit] / trials;
      expect(ratio).toBeGreaterThan(0.21);
      expect(ratio).toBeLessThan(0.29);
    }
  });
});

describe("card suit attempt cost (deducted on both win and loss)", () => {
  const { attemptCost, winPoints } = SCENARIOS["card-suit"];

  it("charges the attempt cost on a win, then pays out win points on top", () => {
    const state: ScoringState = { balance: 30, stats: { attempts: 0, wins: 0, losses: 0 } };

    const afterAttempt = applyAttempt(state, attemptCost);
    expect(afterAttempt.balance).toBe(30 - attemptCost);

    const afterResult = applyResult(afterAttempt, true, winPoints);
    expect(afterResult.balance).toBe(30 - attemptCost + winPoints);
    expect(afterResult.stats).toEqual({ attempts: 1, wins: 1, losses: 0 });
  });

  it("charges the attempt cost on a loss and pays out nothing", () => {
    const state: ScoringState = { balance: 30, stats: { attempts: 0, wins: 0, losses: 0 } };

    const afterAttempt = applyAttempt(state, attemptCost);
    const afterResult = applyResult(afterAttempt, false, 0);

    expect(afterResult.balance).toBe(30 - attemptCost);
    expect(afterResult.stats).toEqual({ attempts: 1, wins: 0, losses: 1 });
  });

  it("never lets the balance go negative even when the attempt cost exceeds it", () => {
    const state: ScoringState = { balance: 2, stats: { attempts: 0, wins: 0, losses: 0 } };

    const afterAttempt = applyAttempt(state, attemptCost);

    expect(afterAttempt.balance).toBe(0);
  });
});

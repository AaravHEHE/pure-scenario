import { describe, expect, it } from "vitest";

import {
  applyAttempt,
  applyResult,
  applyUnlock,
  EMPTY_STATS,
  type ScoringState,
} from "@/lib/scoring";

describe("applyAttempt (balance logic)", () => {
  it("charges the attempt cost and logs one attempt", () => {
    const state: ScoringState = { balance: 10, stats: { attempts: 2, wins: 1, losses: 1 } };

    const next = applyAttempt(state, 3);

    expect(next.balance).toBe(7);
    expect(next.stats).toEqual({ attempts: 3, wins: 1, losses: 1 });
  });

  it("does not charge anything for a zero-cost scenario like the coin flip", () => {
    const state: ScoringState = { balance: 5, stats: EMPTY_STATS };

    const next = applyAttempt(state, 0);

    expect(next.balance).toBe(5);
    expect(next.stats.attempts).toBe(1);
  });

  it("never lets the balance go negative", () => {
    const state: ScoringState = { balance: 2, stats: EMPTY_STATS };

    const next = applyAttempt(state, 5);

    expect(next.balance).toBe(0);
  });
});

describe("applyResult (win/loss recording)", () => {
  it("pays out win points and records a win", () => {
    const state: ScoringState = { balance: 4, stats: { attempts: 1, wins: 0, losses: 0 } };

    const next = applyResult(state, true, 1);

    expect(next.balance).toBe(5);
    expect(next.stats).toEqual({ attempts: 1, wins: 1, losses: 0 });
  });

  it("pays out nothing and records a loss", () => {
    const state: ScoringState = { balance: 4, stats: { attempts: 1, wins: 0, losses: 0 } };

    const next = applyResult(state, false, 1);

    expect(next.balance).toBe(4);
    expect(next.stats).toEqual({ attempts: 1, wins: 0, losses: 1 });
  });

  it("does not touch the attempts count", () => {
    const state: ScoringState = { balance: 0, stats: { attempts: 1, wins: 0, losses: 0 } };

    const next = applyResult(state, true, 1);

    expect(next.stats.attempts).toBe(1);
  });
});

describe("applyUnlock (unlock cost logic)", () => {
  it("succeeds and deducts the unlock cost when affordable", () => {
    expect(applyUnlock(30, 25)).toEqual({ ok: true, balance: 5 });
  });

  it("succeeds when the balance exactly covers the cost", () => {
    expect(applyUnlock(25, 25)).toEqual({ ok: true, balance: 0 });
  });

  it("is refused and changes nothing when not affordable", () => {
    expect(applyUnlock(10, 25)).toEqual({ ok: false, balance: 10 });
  });
});

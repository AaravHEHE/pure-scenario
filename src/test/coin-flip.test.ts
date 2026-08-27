import { describe, expect, it } from "vitest";

import { flipCoin } from "@/lib/coin-flip";

describe("flipCoin", () => {
  it("only ever returns heads or tails", () => {
    for (let i = 0; i < 500; i++) {
      expect(["heads", "tails"]).toContain(flipCoin());
    }
  });

  it("is a reasonably fair 50/50 draw over many trials", () => {
    const trials = 5000;
    let heads = 0;
    for (let i = 0; i < trials; i++) {
      if (flipCoin() === "heads") heads += 1;
    }

    const ratio = heads / trials;
    // Not asserting exactly 0.5 given randomness — just that it isn't biased.
    expect(ratio).toBeGreaterThan(0.45);
    expect(ratio).toBeLessThan(0.55);
  });
});

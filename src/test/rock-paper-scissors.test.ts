import { describe, expect, it } from "vitest";

import { randomThrow, resolveThrow, THROWS, type Throw } from "@/lib/rock-paper-scissors";

describe("resolveThrow (win/lose/tie resolution)", () => {
  const cases: { player: Throw; rng: Throw; expected: "win" | "loss"; note: string }[] = [
    { player: "rock", rng: "rock", expected: "loss", note: "tie" },
    { player: "rock", rng: "paper", expected: "loss", note: "paper beats rock" },
    { player: "rock", rng: "scissors", expected: "win", note: "rock beats scissors" },
    { player: "paper", rng: "rock", expected: "win", note: "paper beats rock" },
    { player: "paper", rng: "paper", expected: "loss", note: "tie" },
    { player: "paper", rng: "scissors", expected: "loss", note: "scissors beats paper" },
    { player: "scissors", rng: "rock", expected: "loss", note: "rock beats scissors" },
    { player: "scissors", rng: "paper", expected: "win", note: "scissors beats paper" },
    { player: "scissors", rng: "scissors", expected: "loss", note: "tie" },
  ];

  it.each(cases)("$player vs $rng ($note) -> $expected", ({ player, rng, expected }) => {
    expect(resolveThrow(player, rng)).toBe(expected);
  });
});

describe("ties count as a loss, not a draw", () => {
  it.each(THROWS)("%s vs itself is a loss", (throwValue) => {
    expect(resolveThrow(throwValue, throwValue)).toBe("loss");
  });
});

describe("randomThrow", () => {
  it("only ever returns rock, paper, or scissors", () => {
    for (let i = 0; i < 500; i++) {
      expect(THROWS).toContain(randomThrow());
    }
  });

  it("is a reasonably uniform draw over many trials", () => {
    const trials = 6000;
    const counts: Record<Throw, number> = { rock: 0, paper: 0, scissors: 0 };
    for (let i = 0; i < trials; i++) {
      counts[randomThrow()] += 1;
    }

    // Not asserting exactly 1/3 each given randomness — just that no option is biased.
    for (const throwValue of THROWS) {
      const ratio = counts[throwValue] / trials;
      expect(ratio).toBeGreaterThan(0.3);
      expect(ratio).toBeLessThan(0.37);
    }
  });
});

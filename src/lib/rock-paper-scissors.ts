export type Throw = "rock" | "paper" | "scissors";

export const THROWS: readonly Throw[] = ["rock", "paper", "scissors"];

/** A uniform random throw, made at call time — never decided in advance. */
export function randomThrow(): Throw {
  const roll = Math.floor(Math.random() * 3);
  switch (roll) {
    case 0:
      return "rock";
    case 1:
      return "paper";
    default:
      return "scissors";
  }
}

const BEATS: Record<Throw, Throw> = {
  rock: "scissors",
  paper: "rock",
  scissors: "paper",
};

export type ThrowOutcome = "win" | "loss";

/**
 * Win only if the player's throw beats the RNG's. A tie counts as a loss —
 * there is no separate draw state or re-throw — which is what makes the
 * true win probability 1/3.
 */
export function resolveThrow(player: Throw, rng: Throw): ThrowOutcome {
  return BEATS[player] === rng ? "win" : "loss";
}

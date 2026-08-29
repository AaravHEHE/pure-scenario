export type ScenarioKey = "coin-flip" | "rock-paper-scissors" | "card-suit";

export interface ScenarioConfig {
  key: ScenarioKey;
  winPoints: number;
  attemptCost: number;
  /** One-time cost to unlock the band. 0 = free forever, no unlock step. */
  unlockCost: number;
}

// Hand-tuned per the scenario ladder in CLAUDE.md — not a formula.
export const SCENARIOS: Record<ScenarioKey, ScenarioConfig> = {
  "coin-flip": { key: "coin-flip", winPoints: 1, attemptCost: 0, unlockCost: 0 },
  "rock-paper-scissors": {
    key: "rock-paper-scissors",
    winPoints: 2,
    attemptCost: 0,
    unlockCost: 0,
  },
  "card-suit": { key: "card-suit", winPoints: 4, attemptCost: 4, unlockCost: 25 },
};

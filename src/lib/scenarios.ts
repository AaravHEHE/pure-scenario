export type ScenarioKey = "coin-flip" | "rock-paper-scissors";

export interface ScenarioConfig {
  key: ScenarioKey;
  winPoints: number;
  attemptCost: number;
}

// Hand-tuned per the scenario ladder in CLAUDE.md — not a formula.
export const SCENARIOS: Record<ScenarioKey, ScenarioConfig> = {
  "coin-flip": { key: "coin-flip", winPoints: 1, attemptCost: 0 },
  "rock-paper-scissors": { key: "rock-paper-scissors", winPoints: 2, attemptCost: 0 },
};

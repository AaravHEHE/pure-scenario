export interface ScenarioStats {
  attempts: number;
  wins: number;
  losses: number;
}

export const EMPTY_STATS: ScenarioStats = { attempts: 0, wins: 0, losses: 0 };

export interface ScoringState {
  balance: number;
  stats: ScenarioStats;
}

/** Charges the attempt cost (0 for bands with none) and logs the attempt. */
export function applyAttempt(state: ScoringState, cost: number): ScoringState {
  return {
    balance: Math.max(0, state.balance - cost),
    stats: { ...state.stats, attempts: state.stats.attempts + 1 },
  };
}

/** Records the win/loss outcome and pays out win points (0 on a loss). */
export function applyResult(state: ScoringState, won: boolean, points: number): ScoringState {
  return {
    balance: won ? state.balance + points : state.balance,
    stats: {
      ...state.stats,
      wins: state.stats.wins + (won ? 1 : 0),
      losses: state.stats.losses + (won ? 0 : 1),
    },
  };
}

export interface UnlockResult {
  ok: boolean;
  balance: number;
}

/** Spends the unlock cost once, if affordable. Refused (unchanged balance) otherwise. */
export function applyUnlock(balance: number, unlockCost: number): UnlockResult {
  if (balance < unlockCost) return { ok: false, balance };
  return { ok: true, balance: balance - unlockCost };
}

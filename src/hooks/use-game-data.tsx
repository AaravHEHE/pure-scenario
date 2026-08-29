import { createContext, useCallback, useContext, useReducer, useRef, type ReactNode } from "react";

import {
  applyAttempt,
  applyResult,
  applyUnlock,
  EMPTY_STATS,
  type ScenarioStats,
} from "@/lib/scoring";
import type { ScenarioKey } from "@/lib/scenarios";

export type { ScenarioStats };

// Guests get no persistence: balance, unlocks, and stats live only in this
// context for the current page load. Reloading erases everything, by
// design (see CLAUDE.md, "Guests vs. accounts — persistence"). Signed-in
// accounts persisting via Supabase comes later, with auth.
interface GameState {
  balance: number;
  stats: Partial<Record<ScenarioKey, ScenarioStats>>;
  unlocked: Partial<Record<ScenarioKey, boolean>>;
}

const INITIAL_STATE: GameState = { balance: 0, stats: {}, unlocked: {} };

type GameStateUpdater = (prev: GameState) => GameState;

interface GameDataContextValue {
  state: GameState;
  setState: (updater: GameStateUpdater) => void;
}

const GameDataContext = createContext<GameDataContextValue | undefined>(undefined);

export function GameDataProvider({ children }: { children: ReactNode }) {
  // A ref, not useState: mutation callers (see the hooks below) need to read
  // the freshly-computed state back out synchronously — e.g. to decide
  // whether an unlock was refused — and React's setState updater callback
  // isn't guaranteed to run synchronously. The ref is always current; the
  // reducer just forces a re-render so consumers see it.
  const stateRef = useRef<GameState>(INITIAL_STATE);
  const [, forceRender] = useReducer((count: number) => count + 1, 0);

  const setState = useCallback((updater: GameStateUpdater) => {
    stateRef.current = updater(stateRef.current);
    forceRender();
  }, []);

  return (
    <GameDataContext.Provider value={{ state: stateRef.current, setState }}>
      {children}
    </GameDataContext.Provider>
  );
}

function useGameDataContext(): GameDataContextValue {
  const ctx = useContext(GameDataContext);
  if (!ctx) throw new Error("useGameData hooks must be used within a GameDataProvider");
  return ctx;
}

export function useBalance() {
  const { state } = useGameDataContext();
  return { data: state.balance };
}

export function useScenarioStats(scenarioKey: ScenarioKey) {
  const { state } = useGameDataContext();
  return { data: state.stats[scenarioKey] ?? EMPTY_STATS };
}

export function useIsScenarioUnlocked(scenarioKey: ScenarioKey): boolean {
  const { state } = useGameDataContext();
  return state.unlocked[scenarioKey] ?? false;
}

/** Charges the (optional) attempt cost and logs the attempt, before the outcome is drawn. */
export function useAttemptScenario() {
  const { setState } = useGameDataContext();

  const mutateAsync = useCallback(
    async ({ scenarioKey, cost = 0 }: { scenarioKey: ScenarioKey; cost?: number }) => {
      let next!: ReturnType<typeof applyAttempt>;
      setState((prev) => {
        const current = { balance: prev.balance, stats: prev.stats[scenarioKey] ?? EMPTY_STATS };
        next = applyAttempt(current, cost);
        return {
          ...prev,
          balance: next.balance,
          stats: { ...prev.stats, [scenarioKey]: next.stats },
        };
      });
      return next;
    },
    [setState],
  );

  return { mutateAsync };
}

/** Records the win/loss outcome and pays out win points (0 on a loss). */
export function useRecordScenarioResult() {
  const { setState } = useGameDataContext();

  const mutateAsync = useCallback(
    async ({
      scenarioKey,
      won,
      points = 0,
    }: {
      scenarioKey: ScenarioKey;
      won: boolean;
      points?: number;
    }) => {
      let next!: ReturnType<typeof applyResult>;
      setState((prev) => {
        const current = { balance: prev.balance, stats: prev.stats[scenarioKey] ?? EMPTY_STATS };
        next = applyResult(current, won, points);
        return {
          ...prev,
          balance: next.balance,
          stats: { ...prev.stats, [scenarioKey]: next.stats },
        };
      });
      return next;
    },
    [setState],
  );

  return { mutateAsync };
}

/** Spends the unlock cost once from the shared balance. Refuses (throws) if unaffordable. */
export function useUnlockScenario() {
  const { setState } = useGameDataContext();

  const mutateAsync = useCallback(
    async ({ scenarioKey, unlockCost }: { scenarioKey: ScenarioKey; unlockCost: number }) => {
      let result!: ReturnType<typeof applyUnlock>;
      setState((prev) => {
        result = applyUnlock(prev.balance, unlockCost);
        if (!result.ok) return prev;
        return {
          ...prev,
          balance: result.balance,
          unlocked: { ...prev.unlocked, [scenarioKey]: true },
        };
      });
      if (!result.ok) throw new Error("Insufficient balance to unlock this scenario");
      return result.balance;
    },
    [setState],
  );

  return { mutateAsync };
}

import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";

import {
  GameDataProvider,
  useAttemptScenario,
  useBalance,
  useIsScenarioUnlocked,
  useRecordScenarioResult,
  useScenarioStats,
  useUnlockScenario,
} from "@/hooks/use-game-data";

function wrapper({ children }: { children: ReactNode }) {
  return <GameDataProvider>{children}</GameDataProvider>;
}

function useHarness() {
  return {
    balance: useBalance(),
    coinStats: useScenarioStats("coin-flip"),
    cardStats: useScenarioStats("card-suit"),
    cardUnlocked: useIsScenarioUnlocked("card-suit"),
    attempt: useAttemptScenario(),
    record: useRecordScenarioResult(),
    unlock: useUnlockScenario(),
  };
}

describe("useAttemptScenario", () => {
  it("writes an attempt with the given cost", async () => {
    const { result } = renderHook(useHarness, { wrapper });

    await act(async () => {
      await result.current.attempt.mutateAsync({ scenarioKey: "coin-flip", cost: 0 });
    });

    expect(result.current.coinStats.data).toEqual({ attempts: 1, wins: 0, losses: 0 });
  });
});

describe("useRecordScenarioResult (win/loss recording)", () => {
  it("records a win and pays out points", async () => {
    const { result } = renderHook(useHarness, { wrapper });

    await act(async () => {
      await result.current.record.mutateAsync({ scenarioKey: "coin-flip", won: true, points: 1 });
    });

    expect(result.current.balance.data).toBe(1);
    expect(result.current.coinStats.data).toMatchObject({ wins: 1, losses: 0 });
  });

  it("records a loss and pays out nothing", async () => {
    const { result } = renderHook(useHarness, { wrapper });

    await act(async () => {
      await result.current.record.mutateAsync({ scenarioKey: "coin-flip", won: false, points: 1 });
    });

    expect(result.current.balance.data).toBe(0);
    expect(result.current.coinStats.data).toMatchObject({ wins: 0, losses: 1 });
  });
});

describe("balance is shared across scenarios (generalized data layer)", () => {
  it("carries the balance forward from one scenario's win into the next scenario's attempt", async () => {
    const { result } = renderHook(useHarness, { wrapper });

    await act(async () => {
      await result.current.record.mutateAsync({ scenarioKey: "coin-flip", won: true, points: 1 });
    });
    await act(async () => {
      await result.current.record.mutateAsync({
        scenarioKey: "rock-paper-scissors",
        won: true,
        points: 2,
      });
    });

    // One shared balance: the second scenario's win builds on the first's, 1 + 2 = 3.
    expect(result.current.balance.data).toBe(3);

    await act(async () => {
      await result.current.attempt.mutateAsync({ scenarioKey: "rock-paper-scissors", cost: 0 });
    });
    // Attempting doesn't touch the shared balance when cost is 0.
    expect(result.current.balance.data).toBe(3);
  });
});

describe("useUnlockScenario", () => {
  it("succeeds and deducts correctly when affordable", async () => {
    const { result } = renderHook(useHarness, { wrapper });

    // Fund the balance first via bands 1-2, same as a real player would.
    await act(async () => {
      await result.current.record.mutateAsync({ scenarioKey: "coin-flip", won: true, points: 30 });
    });

    await act(async () => {
      await result.current.unlock.mutateAsync({ scenarioKey: "card-suit", unlockCost: 25 });
    });

    expect(result.current.balance.data).toBe(5);
    expect(result.current.cardUnlocked).toBe(true);
  });

  it("is refused and changes nothing when not affordable", async () => {
    const { result } = renderHook(useHarness, { wrapper });

    await act(async () => {
      await result.current.record.mutateAsync({ scenarioKey: "coin-flip", won: true, points: 10 });
    });

    await expect(
      act(async () => {
        await result.current.unlock.mutateAsync({ scenarioKey: "card-suit", unlockCost: 25 });
      }),
    ).rejects.toThrow();

    expect(result.current.balance.data).toBe(10);
    expect(result.current.cardUnlocked).toBe(false);
  });

  it("never re-locks after a successful unlock", async () => {
    const { result } = renderHook(useHarness, { wrapper });

    await act(async () => {
      await result.current.record.mutateAsync({ scenarioKey: "coin-flip", won: true, points: 25 });
    });
    await act(async () => {
      await result.current.unlock.mutateAsync({ scenarioKey: "card-suit", unlockCost: 25 });
    });

    expect(result.current.cardUnlocked).toBe(true);

    // Draining the balance back to 0 afterwards must not re-lock the band.
    await act(async () => {
      await result.current.attempt.mutateAsync({ scenarioKey: "card-suit", cost: 0 });
    });
    expect(result.current.cardUnlocked).toBe(true);
  });
});

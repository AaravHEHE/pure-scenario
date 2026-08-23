import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const upsertCalls: { table: string; values: unknown }[] = [];

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
        upsert: async (values: unknown) => {
          upsertCalls.push({ table, values });
          return { data: null, error: null };
        },
      }),
    },
  };
});

vi.mock("@/lib/guest-id", () => ({
  getGuestId: () => "test-guest-id",
}));

import { useAttemptScenario, useRecordScenarioResult } from "@/hooks/use-game-data";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  upsertCalls.length = 0;
});

describe("useAttemptScenario", () => {
  it("writes an attempt with the given cost", async () => {
    const { result } = renderHook(() => useAttemptScenario(), { wrapper });

    await waitFor(() => expect(result.current.mutateAsync).toBeDefined());
    await act(async () => {
      await result.current.mutateAsync({ scenarioKey: "coin-flip", cost: 0 });
    });

    const statsUpsert = upsertCalls.find((c) => c.table === "scenario_stats");
    expect(statsUpsert?.values).toMatchObject({
      player_id: "test-guest-id",
      scenario_key: "coin-flip",
      attempts: 1,
    });
  });
});

describe("useRecordScenarioResult (win/loss recording)", () => {
  it("records a win and pays out points", async () => {
    const { result } = renderHook(() => useRecordScenarioResult(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ scenarioKey: "coin-flip", won: true, points: 1 });
    });

    const balanceUpsert = upsertCalls.find((c) => c.table === "player_balances");
    const statsUpsert = upsertCalls.find((c) => c.table === "scenario_stats");
    expect(balanceUpsert?.values).toMatchObject({ player_id: "test-guest-id", balance: 1 });
    expect(statsUpsert?.values).toMatchObject({ wins: 1, losses: 0 });
  });

  it("records a loss and pays out nothing", async () => {
    const { result } = renderHook(() => useRecordScenarioResult(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ scenarioKey: "coin-flip", won: false, points: 1 });
    });

    const balanceUpsert = upsertCalls.find((c) => c.table === "player_balances");
    const statsUpsert = upsertCalls.find((c) => c.table === "scenario_stats");
    expect(balanceUpsert?.values).toMatchObject({ player_id: "test-guest-id", balance: 0 });
    expect(statsUpsert?.values).toMatchObject({ wins: 0, losses: 1 });
  });
});

describe("balance is shared across scenarios (generalized data layer)", () => {
  it("carries the balance forward from one scenario's win into the next scenario's attempt", async () => {
    const { result } = renderHook(
      () => ({ record: useRecordScenarioResult(), attempt: useAttemptScenario() }),
      { wrapper },
    );

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

    const balanceUpserts = upsertCalls.filter((c) => c.table === "player_balances");
    // One shared balance key: the second scenario's win builds on the first's, 1 + 2 = 3.
    expect(balanceUpserts.at(-1)?.values).toMatchObject({ balance: 3 });

    // But per-scenario stats stay independent — a fresh row for the new scenario.
    const rpsStatsUpsert = upsertCalls.find(
      (c) =>
        c.table === "scenario_stats" &&
        (c.values as { scenario_key: string }).scenario_key === "rock-paper-scissors",
    );
    expect(rpsStatsUpsert?.values).toMatchObject({ wins: 1, losses: 0 });

    await act(async () => {
      await result.current.attempt.mutateAsync({ scenarioKey: "rock-paper-scissors", cost: 0 });
    });
    // Attempting doesn't touch the shared balance when cost is 0.
    expect(upsertCalls.filter((c) => c.table === "player_balances").at(-1)?.values).toMatchObject({
      balance: 3,
    });
  });
});

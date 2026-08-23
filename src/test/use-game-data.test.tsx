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

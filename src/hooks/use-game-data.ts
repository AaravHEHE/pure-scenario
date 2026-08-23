import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { getGuestId } from "@/lib/guest-id";
import { applyAttempt, applyResult, EMPTY_STATS, type ScenarioStats } from "@/lib/scoring";
import type { ScenarioKey } from "@/lib/scenarios";

export type { ScenarioStats };

function usePlayerId(): string | undefined {
  const [playerId, setPlayerId] = useState<string>();
  useEffect(() => {
    setPlayerId(getGuestId());
  }, []);
  return playerId;
}

export function useBalance() {
  const playerId = usePlayerId();
  return useQuery({
    queryKey: ["balance", playerId],
    enabled: !!playerId,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from("player_balances")
        .select("balance")
        .eq("player_id", playerId as string)
        .maybeSingle();
      if (error) throw error;
      return data?.balance ?? 0;
    },
  });
}

export function useScenarioStats(scenarioKey: ScenarioKey) {
  const playerId = usePlayerId();
  return useQuery({
    queryKey: ["scenario-stats", playerId, scenarioKey],
    enabled: !!playerId,
    queryFn: async (): Promise<ScenarioStats> => {
      const { data, error } = await supabase
        .from("scenario_stats")
        .select("attempts, wins, losses")
        .eq("player_id", playerId as string)
        .eq("scenario_key", scenarioKey)
        .maybeSingle();
      if (error) throw error;
      return data ? { attempts: data.attempts, wins: data.wins, losses: data.losses } : EMPTY_STATS;
    },
  });
}

/** Charges the (optional) attempt cost and logs the attempt, before the outcome is drawn. */
export function useAttemptScenario() {
  const playerId = usePlayerId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scenarioKey, cost = 0 }: { scenarioKey: ScenarioKey; cost?: number }) => {
      if (!playerId) throw new Error("Player is not ready yet");

      const balance = queryClient.getQueryData<number>(["balance", playerId]) ?? 0;
      const stats =
        queryClient.getQueryData<ScenarioStats>(["scenario-stats", playerId, scenarioKey]) ??
        EMPTY_STATS;
      const next = applyAttempt({ balance, stats }, cost);

      const [balanceResult, statsResult] = await Promise.all([
        supabase
          .from("player_balances")
          .upsert({ player_id: playerId, balance: next.balance }, { onConflict: "player_id" }),
        supabase
          .from("scenario_stats")
          .upsert(
            { player_id: playerId, scenario_key: scenarioKey, ...next.stats },
            { onConflict: "player_id,scenario_key" },
          ),
      ]);
      if (balanceResult.error) throw balanceResult.error;
      if (statsResult.error) throw statsResult.error;

      return { scenarioKey, next };
    },
    onSuccess: ({ scenarioKey, next }) => {
      queryClient.setQueryData(["balance", playerId], next.balance);
      queryClient.setQueryData(["scenario-stats", playerId, scenarioKey], next.stats);
    },
  });
}

/** Records the win/loss outcome and pays out win points (0 on a loss). */
export function useRecordScenarioResult() {
  const playerId = usePlayerId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scenarioKey,
      won,
      points = 0,
    }: {
      scenarioKey: ScenarioKey;
      won: boolean;
      points?: number;
    }) => {
      if (!playerId) throw new Error("Player is not ready yet");

      const balance = queryClient.getQueryData<number>(["balance", playerId]) ?? 0;
      const stats =
        queryClient.getQueryData<ScenarioStats>(["scenario-stats", playerId, scenarioKey]) ??
        EMPTY_STATS;
      const next = applyResult({ balance, stats }, won, points);

      const [balanceResult, statsResult] = await Promise.all([
        supabase
          .from("player_balances")
          .upsert({ player_id: playerId, balance: next.balance }, { onConflict: "player_id" }),
        supabase
          .from("scenario_stats")
          .upsert(
            { player_id: playerId, scenario_key: scenarioKey, ...next.stats },
            { onConflict: "player_id,scenario_key" },
          ),
      ]);
      if (balanceResult.error) throw balanceResult.error;
      if (statsResult.error) throw statsResult.error;

      return { scenarioKey, next };
    },
    onSuccess: ({ scenarioKey, next }) => {
      queryClient.setQueryData(["balance", playerId], next.balance);
      queryClient.setQueryData(["scenario-stats", playerId, scenarioKey], next.stats);
    },
  });
}

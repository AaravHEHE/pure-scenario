import { supabase } from "@/integrations/supabase/client";
import type { LeaderboardEntry } from "@/lib/leaderboard";

/**
 * Reads the real leaderboard (signed-in accounts only; see the
 * add_leaderboard migration). Read-only and argument-free on purpose, so no
 * guest data can ever be part of the request.
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("leaderboard_entries")
    .select("display_name, total_points")
    .order("total_points", { ascending: false })
    .order("display_name", { ascending: true });
  if (error) throw error;
  return data.map((row) => ({ displayName: row.display_name, totalPoints: row.total_points }));
}

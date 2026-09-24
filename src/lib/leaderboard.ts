// Pure leaderboard logic. Everything about the guest here is computed from
// data already in the browser and is only ever rendered. None of it is sent
// anywhere (see fetchLeaderboard, which takes no arguments).

export interface LeaderboardEntry {
  displayName: string;
  totalPoints: number;
}

export type LeaderboardRow =
  | { kind: "real"; rank: number; displayName: string; totalPoints: number }
  | { kind: "guest-preview"; rank: number; totalPoints: number };

/**
 * Real entries, highest points first, with competition ranking (1, 2, 2, 4).
 * Entries tied on points keep their incoming order.
 */
export function rankEntries(entries: readonly LeaderboardEntry[]): LeaderboardRow[] {
  const sorted = [...entries].sort((a, b) => b.totalPoints - a.totalPoints);
  return sorted.map((entry) => ({
    kind: "real",
    // Rank = 1 + how many entries have strictly more points.
    rank: sorted.findIndex((other) => other.totalPoints === entry.totalPoints) + 1,
    ...entry,
  }));
}

/**
 * Real entries plus a preview row showing where the guest's points would
 * place. Ties go to the real entry: a preview never displaces someone who is
 * actually on the board, so the guest sits after every real entry with the
 * same or more points, and its rank is one past them. Real entries keep their
 * real ranks, since the guest isn't competing. No preview row at 0 points.
 */
export function withGuestPreview(
  entries: readonly LeaderboardEntry[],
  guestPoints: number,
): LeaderboardRow[] {
  const rows = rankEntries(entries);
  if (guestPoints <= 0) return rows;
  const position = rows.filter((row) => row.totalPoints >= guestPoints).length;
  const guest: LeaderboardRow = {
    kind: "guest-preview",
    rank: position + 1,
    totalPoints: guestPoints,
  };
  return [...rows.slice(0, position), guest, ...rows.slice(position)];
}

import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { useIsSignedIn } from "@/hooks/use-auth-status";
import { useTotalPointsEarned } from "@/hooks/use-game-data";
import { rankEntries, withGuestPreview, type LeaderboardRow } from "@/lib/leaderboard";
import { fetchLeaderboard } from "@/lib/leaderboard-api";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — purerandomness" },
      {
        name: "description",
        content: "Leaderboard shell for purerandomness: rank, player and total points columns.",
      },
      { property: "og:title", content: "Leaderboard — purerandomness" },
      {
        property: "og:description",
        content: "Leaderboard shell: rank, player and total points columns.",
      },
    ],
  }),
  component: LeaderboardPage,
});

const columns = ["Rank", "Player", "Total Points"];

function LeaderboardPage() {
  const signedIn = useIsSignedIn();
  const { data: guestPoints } = useTotalPointsEarned();
  // The query is the same for everyone and carries nothing about the viewer.
  const leaderboard = useQuery({ queryKey: ["leaderboard"], queryFn: fetchLeaderboard });

  // The guest row is computed here, in the browser, from the fetched list.
  const rows = leaderboard.data
    ? signedIn
      ? rankEntries(leaderboard.data)
      : withGuestPreview(leaderboard.data, guestPoints)
    : [];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-5xl leading-none sm:text-6xl">Leaderboard</h1>
      <div className="mt-10 w-full overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="border-b-2 px-3 py-3 font-sans text-xs uppercase tracking-widest"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leaderboard.isPending ? (
              <StatusRow>Loading…</StatusRow>
            ) : leaderboard.isError ? (
              <StatusRow>The leaderboard couldn't be loaded.</StatusRow>
            ) : (
              rows.map((row) => <Row key={rowKey(row)} row={row} />)
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function rowKey(row: LeaderboardRow) {
  return row.kind === "real" ? `real:${row.displayName}` : "guest-preview";
}

function StatusRow({ children }: { children: string }) {
  return (
    <tr>
      <td colSpan={columns.length} className="px-3 py-3 font-sans text-sm">
        {children}
      </td>
    </tr>
  );
}

function Row({ row }: { row: LeaderboardRow }) {
  if (row.kind === "guest-preview") {
    return (
      <tr data-guest-preview="" className="border-2 border-dashed border-ink font-sans text-sm">
        <td className="px-3 py-3 tabular-nums">{row.rank}</td>
        <td className="px-3 py-3">
          <span className="flex items-center gap-2">
            You
            <span className="border border-ink px-1.5 py-0.5 text-[10px] uppercase leading-none tracking-widest">
              Guest
            </span>
          </span>
        </td>
        <td className="px-3 py-3 tabular-nums">{row.totalPoints}</td>
      </tr>
    );
  }
  return (
    <tr className="border-b font-sans text-sm">
      <td className="px-3 py-3 tabular-nums">{row.rank}</td>
      <td className="px-3 py-3">{row.displayName}</td>
      <td className="px-3 py-3 tabular-nums">{row.totalPoints}</td>
    </tr>
  );
}

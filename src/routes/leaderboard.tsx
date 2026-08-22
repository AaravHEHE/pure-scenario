import { createFileRoute } from "@tanstack/react-router";

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
          <tbody />
        </table>
      </div>
    </main>
  );
}

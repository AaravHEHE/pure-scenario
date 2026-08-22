import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Stats — purerandomness" },
      {
        name: "description",
        content: "Scenario stats shell for purerandomness: attempts, wins and losses per scenario.",
      },
      { property: "og:title", content: "Stats — purerandomness" },
      {
        property: "og:description",
        content: "Scenario stats shell: attempts, wins and losses per scenario.",
      },
    ],
  }),
  component: StatsPage,
});

const columns = ["Scenario", "Attempts", "Wins", "Losses"];

function StatsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-5xl leading-none sm:text-6xl">Stats</h1>
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

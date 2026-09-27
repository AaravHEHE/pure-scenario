import { createFileRoute } from "@tanstack/react-router";

import { useIsSignedIn } from "@/hooks/use-auth-status";
import { useScenarioStats } from "@/hooks/use-game-data";
import { SCENARIOS, type ScenarioConfig } from "@/lib/scenarios";

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
  const signedIn = useIsSignedIn();

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
          {/* Guests see this page load's in-memory stats. Accounts will read
              their persisted stats once account persistence exists. */}
          <tbody>
            {signedIn
              ? null
              : Object.values(SCENARIOS).map((scenario) => (
                  <GuestStatsRow key={scenario.key} scenario={scenario} />
                ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function GuestStatsRow({ scenario }: { scenario: ScenarioConfig }) {
  const { data: stats } = useScenarioStats(scenario.key);
  return (
    <tr className="border-b font-sans text-sm">
      <th scope="row" className="px-3 py-3 text-left font-normal">
        {scenario.name}
      </th>
      <td className="px-3 py-3 tabular-nums">{stats.attempts}</td>
      <td className="px-3 py-3 tabular-nums">{stats.wins}</td>
      <td className="px-3 py-3 tabular-nums">{stats.losses}</td>
    </tr>
  );
}

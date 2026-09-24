import type { ComponentType } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("@/hooks/use-auth-status", () => ({ useIsSignedIn: () => false }));

import { GameDataProvider } from "@/hooks/use-game-data";
import { Route as StatsRoute } from "@/routes/stats";
import { PlayedSession, repeat } from "@/test/helpers/guest-session";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StatsPage = (StatsRoute.options as any).component as ComponentType;

function rowFor(name: string) {
  const header = screen.getByRole("rowheader", { name });
  const cells = within(header.closest("tr")!)
    .getAllByRole("cell")
    .map((c) => c.textContent);
  return cells;
}

describe("/stats for a guest", () => {
  it("shows the attempts, wins and losses tracked this session, per scenario", async () => {
    render(
      <GameDataProvider>
        <PlayedSession
          plays={[
            ...repeat(3, { scenarioKey: "coin-flip", won: true }),
            ...repeat(2, { scenarioKey: "coin-flip", won: false }),
            ...repeat(1, { scenarioKey: "rock-paper-scissors", won: true }),
            ...repeat(4, { scenarioKey: "rock-paper-scissors", won: false }),
          ]}
        >
          <StatsPage />
        </PlayedSession>
      </GameDataProvider>,
    );

    expect(await screen.findByRole("rowheader", { name: "Coin flip" })).toBeInTheDocument();
    expect(rowFor("Coin flip")).toEqual(["5", "3", "2"]);
    expect(rowFor("Rock paper scissors")).toEqual(["5", "1", "4"]);
    expect(rowFor("Card suit")).toEqual(["0", "0", "0"]);
  });

  it("is not an empty table even before anything is played", () => {
    render(
      <GameDataProvider>
        <StatsPage />
      </GameDataProvider>,
    );
    // Header row + one row per scenario in the ladder.
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(rowFor("Coin flip")).toEqual(["0", "0", "0"]);
  });
});

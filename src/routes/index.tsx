import { createFileRoute } from "@tanstack/react-router";

import { CoinFlipBand } from "@/components/scenario-bands/coin-flip-band";
import { RockPaperScissorsBand } from "@/components/scenario-bands/rock-paper-scissors-band";
import { CardSuitBand } from "@/components/scenario-bands/card-suit-band";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "purerandomness — Play the Scenario Bands" },
      {
        name: "description",
        content:
          "A ladder of pure-chance games, easiest odds first: flip a coin, throw rock paper scissors against a random number generator, call a card suit. Pick before every reveal, win points, and spend them to unlock the next band.",
      },
      { property: "og:title", content: "purerandomness — Play the Scenario Bands" },
      {
        property: "og:description",
        content:
          "A ladder of pure-chance games. Pick before every reveal, win points, and spend them to unlock harder odds.",
      },
    ],
  }),
  component: GamePage,
});

function GamePage() {
  return (
    <main>
      <CoinFlipBand />
      <RockPaperScissorsBand />
      <CardSuitBand />
    </main>
  );
}

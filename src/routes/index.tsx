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
          "purerandomness game shell: three full-bleed scenario bands with placeholder slots and start actions.",
      },
      { property: "og:title", content: "purerandomness — Play the Scenario Bands" },
      {
        property: "og:description",
        content: "Three full-bleed scenario bands with placeholder slots and start actions.",
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

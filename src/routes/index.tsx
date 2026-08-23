import { createFileRoute } from "@tanstack/react-router";

import { CoinFlipBand } from "@/components/scenario-bands/coin-flip-band";

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

const placeholderBands = [
  { key: "band-2", bg: "bg-mustard", text: "text-on-light", slot: "border-on-light" },
  { key: "band-3", bg: "bg-forest", text: "text-on-dark", slot: "border-on-dark" },
] as const;

function GamePage() {
  return (
    <main>
      <CoinFlipBand />
      {placeholderBands.map((band) => (
        <section
          key={band.key}
          className={`flex min-h-[78vh] w-full flex-col items-center justify-center gap-8 px-4 py-16 ${band.bg} ${band.text}`}
        >
          <h1 className="text-center font-display text-5xl leading-none sm:text-7xl">Scenario 1</h1>
          <div
            aria-label="scenario slot"
            className={`aspect-square w-56 border-2 sm:w-72 ${band.slot}`}
          />
          <button
            type="button"
            className={`border-2 px-10 py-3 font-sans text-sm uppercase tracking-widest ${band.slot}`}
          >
            Start
          </button>
        </section>
      ))}
    </main>
  );
}

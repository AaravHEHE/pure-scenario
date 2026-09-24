import { useEffect, useRef, useState, type CSSProperties } from "react";

import { audioManager } from "@/lib/audio-manager";
import { flipCoin, type CoinSide } from "@/lib/coin-flip";
import { useAttemptScenario, useBalance, useRecordScenarioResult } from "@/hooks/use-game-data";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SCENARIOS } from "@/lib/scenarios";
import { BalanceChip } from "@/components/scenario-bands/balance-chip";
import { BandSubtitle } from "@/components/scenario-bands/band-subtitle";

const SCENARIO = SCENARIOS["coin-flip"];
const FLIP_DURATION_MS = 900;
// Every flip starts from 0deg and lands here: 5.5 turns, so the back face (which
// carries the result) ends up toward the viewer. Never accumulates across flips.
const SPIN_DEGREES = 1980;
const COIN_THICKNESS_PX = 8;
// Solid discs stacked between the two faces form the coin's rim mid-spin.
const RIM_OFFSETS_PX = Array.from(
  { length: COIN_THICKNESS_PX - 1 },
  (_, i) => i - (COIN_THICKNESS_PX - 2) / 2,
);

type Phase = "idle" | "flipping" | "result";

interface PlayedFlip {
  pick: CoinSide;
  outcome: CoinSide;
}

const sideLabel: Record<CoinSide, string> = { heads: "Heads", tails: "Tails" };

const hiddenBackface: CSSProperties = {
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
};

const faceClass =
  "absolute inset-0 flex items-center justify-center rounded-full border-2 border-on-dark bg-tomato px-4 text-center font-display text-3xl text-on-dark";

export function CoinFlipBand() {
  const [pick, setPick] = useState<CoinSide | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  // Snapshot of what was actually played, taken when the flip is triggered.
  // Everything on the result screen reads from this, never from `pick`.
  const [played, setPlayed] = useState<PlayedFlip | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: balance } = useBalance();
  const attemptScenario = useAttemptScenario();
  const recordResult = useRecordScenarioResult();

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  async function handleFlip() {
    if (!pick || phase !== "idle") return;
    const pickedSide = pick;

    audioManager.play("click");

    try {
      await attemptScenario.mutateAsync({ scenarioKey: SCENARIO.key, cost: SCENARIO.attemptCost });
    } catch {
      return;
    }

    // Decided now, at the moment of the flip — not in advance.
    const outcome = flipCoin();
    const won = outcome === pickedSide;

    setPlayed({ pick: pickedSide, outcome });
    setPhase("flipping");

    const reveal = async () => {
      setPhase("result");
      audioManager.play(won ? "win" : "lose");

      try {
        await recordResult.mutateAsync({
          scenarioKey: SCENARIO.key,
          won,
          points: won ? SCENARIO.winPoints : 0,
        });
      } catch {
        // Balance/stat sync failed; the flip itself already resolved for the player.
      }
    };

    if (reducedMotion) {
      void reveal();
    } else {
      timeoutRef.current = setTimeout(() => void reveal(), FLIP_DURATION_MS);
    }
  }

  function handlePlayAgain() {
    setPick(null);
    setPhase("idle");
    setPlayed(null);
  }

  // Idle snaps back to 0deg with no transition, so the prompt is always on the
  // front face, right-reading, and the next flip starts from the same baseline.
  const rotation = phase === "idle" ? 0 : SPIN_DEGREES;
  const animating = phase === "flipping" && !reducedMotion;
  const won = played !== null && played.outcome === played.pick;

  const frontText = played
    ? `Picked: ${sideLabel[played.pick]}`
    : pick
      ? `Picked: ${sideLabel[pick]}`
      : "Pick a side";
  // Mid-flip the back face repeats the pick so the outcome can't leak before the reveal.
  const backText = played
    ? phase === "result"
      ? sideLabel[played.outcome]
      : `Picked: ${sideLabel[played.pick]}`
    : "";

  return (
    <section className="flex min-h-[78vh] w-full flex-col items-center justify-center gap-8 bg-tomato px-4 py-16 text-on-tomato">
      <h1 className="text-center font-display text-5xl leading-none text-on-dark sm:text-7xl">
        Scenario 1
      </h1>
      <BandSubtitle>Coin flip · 1/2 odds · 1 point</BandSubtitle>

      <div className="[perspective:800px]">
        <div
          aria-live="polite"
          // Purely visual. Edge-on 3D planes hit-test unpredictably in Chrome and
          // were measured intercepting clicks meant for the buttons below.
          className={`pointer-events-none relative aspect-square w-56 sm:w-72 ${
            animating ? "transition-transform duration-[900ms] ease-out" : ""
          }`}
          style={{ transformStyle: "preserve-3d", transform: `rotateY(${rotation}deg)` }}
        >
          {RIM_OFFSETS_PX.map((z) => (
            <div
              key={z}
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-on-dark"
              style={{ transform: `translateZ(${z}px)` }}
            />
          ))}
          {/* The stacked discs vanish when exactly edge-on; this strip is the rim at 90deg. */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-1/2 bg-on-dark"
            style={{
              width: COIN_THICKNESS_PX,
              marginLeft: -COIN_THICKNESS_PX / 2,
              transform: "rotateY(90deg)",
            }}
          />

          <div
            data-face="front"
            aria-hidden={phase === "result"}
            className={faceClass}
            style={{ ...hiddenBackface, transform: `translateZ(${COIN_THICKNESS_PX / 2}px)` }}
          >
            {frontText}
          </div>
          <div
            data-face="back"
            aria-hidden={phase !== "result"}
            className={faceClass}
            style={{
              ...hiddenBackface,
              transform: `rotateY(180deg) translateZ(${COIN_THICKNESS_PX / 2}px)`,
            }}
          >
            {backText}
          </div>
        </div>
      </div>

      <div role="group" aria-label="Pick heads or tails" className="flex gap-4">
        {(["heads", "tails"] as const).map((side) => (
          <button
            key={side}
            type="button"
            disabled={phase !== "idle"}
            aria-pressed={(played?.pick ?? pick) === side}
            onClick={() => setPick(side)}
            className={`border-2 border-on-tomato px-8 py-3 font-sans text-sm uppercase tracking-widest ${
              (played?.pick ?? pick) === side ? "bg-on-tomato text-tomato" : ""
            }`}
          >
            {sideLabel[side]}
          </button>
        ))}
      </div>

      {phase === "result" ? (
        <div className="flex flex-col items-center gap-4">
          <p className="font-sans text-sm uppercase tracking-widest">
            {won ? "You won — +1 point" : "You lost"}
          </p>
          <button
            type="button"
            onClick={handlePlayAgain}
            className="border-2 border-on-tomato px-10 py-3 font-sans text-sm uppercase tracking-widest"
          >
            Flip again
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={!pick || phase === "flipping"}
          onClick={() => void handleFlip()}
          className="border-2 border-on-tomato px-10 py-3 font-sans text-sm uppercase tracking-widest disabled:opacity-50"
        >
          {phase === "flipping" ? "Flipping…" : "Flip"}
        </button>
      )}

      <BalanceChip balance={balance ?? 0} />
    </section>
  );
}

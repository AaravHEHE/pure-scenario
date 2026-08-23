import { useEffect, useRef, useState } from "react";

import { audioManager } from "@/lib/audio-manager";
import { flipCoin, type CoinSide } from "@/lib/coin-flip";
import { useAttemptScenario, useBalance, useRecordScenarioResult } from "@/hooks/use-game-data";
import { SCENARIOS } from "@/lib/scenarios";

const SCENARIO = SCENARIOS["coin-flip"];
const FLIP_DURATION_MS = 900;

type Phase = "idle" | "flipping" | "result";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

const sideLabel: Record<CoinSide, string> = { heads: "Heads", tails: "Tails" };

export function CoinFlipBand() {
  const [pick, setPick] = useState<CoinSide | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<CoinSide | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: balance } = useBalance();
  const attemptScenario = useAttemptScenario();
  const recordResult = useRecordScenarioResult();

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  async function handleFlip() {
    if (!pick || phase === "flipping") return;

    audioManager.play("click");

    try {
      await attemptScenario.mutateAsync({ scenarioKey: SCENARIO.key, cost: SCENARIO.attemptCost });
    } catch {
      return;
    }

    setPhase("flipping");

    const settle = async () => {
      const outcome = flipCoin();
      const won = outcome === pick;
      setResult(outcome);
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
      void settle();
    } else {
      timeoutRef.current = setTimeout(() => void settle(), FLIP_DURATION_MS);
    }
  }

  function handlePlayAgain() {
    setPick(null);
    setPhase("idle");
    setResult(null);
  }

  const rotation = phase === "flipping" ? 1800 : phase === "result" && result === "tails" ? 180 : 0;

  return (
    <section className="flex min-h-[78vh] w-full flex-col items-center justify-center gap-8 bg-tomato px-4 py-16 text-on-dark">
      <h1 className="text-center font-display text-5xl leading-none sm:text-7xl">Scenario 1</h1>
      <p className="font-sans text-sm uppercase tracking-widest">Coin flip · 1/2 odds · 1 point</p>

      <div className="[perspective:800px]">
        <div
          aria-live="polite"
          className="flex aspect-square w-56 items-center justify-center rounded-full border-2 border-on-dark px-4 text-center font-display text-3xl transition-transform duration-[900ms] ease-out sm:w-72"
          style={reducedMotion ? undefined : { transform: `rotateY(${rotation}deg)` }}
        >
          {phase === "result" && result
            ? sideLabel[result]
            : pick
              ? `Picked: ${sideLabel[pick]}`
              : "Pick a side"}
        </div>
      </div>

      <div role="group" aria-label="Pick heads or tails" className="flex gap-4">
        {(["heads", "tails"] as const).map((side) => (
          <button
            key={side}
            type="button"
            disabled={phase === "flipping"}
            aria-pressed={pick === side}
            onClick={() => setPick(side)}
            className={`border-2 border-on-dark px-8 py-3 font-sans text-sm uppercase tracking-widest ${
              pick === side ? "bg-on-dark text-tomato" : ""
            }`}
          >
            {sideLabel[side]}
          </button>
        ))}
      </div>

      {phase === "result" ? (
        <div className="flex flex-col items-center gap-4">
          <p className="font-sans text-sm uppercase tracking-widest">
            {result === pick ? "You won — +1 point" : "You lost"}
          </p>
          <button
            type="button"
            onClick={handlePlayAgain}
            className="border-2 border-on-dark px-10 py-3 font-sans text-sm uppercase tracking-widest"
          >
            Flip again
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={!pick || phase === "flipping"}
          onClick={() => void handleFlip()}
          className="border-2 border-on-dark px-10 py-3 font-sans text-sm uppercase tracking-widest disabled:opacity-50"
        >
          {phase === "flipping" ? "Flipping…" : "Flip"}
        </button>
      )}

      <p className="font-sans text-xs uppercase tracking-widest text-on-dark/70">
        Balance: {balance ?? 0}
      </p>
    </section>
  );
}

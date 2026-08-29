import { useEffect, useRef, useState } from "react";

import { audioManager } from "@/lib/audio-manager";
import { drawSuit, SUITS, type Suit } from "@/lib/card-suit";
import {
  useAttemptScenario,
  useBalance,
  useIsScenarioUnlocked,
  useRecordScenarioResult,
  useUnlockScenario,
} from "@/hooks/use-game-data";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SCENARIOS } from "@/lib/scenarios";
import { SuitIcon } from "@/components/scenario-bands/suit-icon";
import { LockIcon } from "@/components/icons/lock-icon";

const SCENARIO = SCENARIOS["card-suit"];
const DRAW_DURATION_MS = 900;

type Phase = "idle" | "drawing" | "result";

const suitLabel: Record<Suit, string> = {
  hearts: "Hearts",
  diamonds: "Diamonds",
  clubs: "Clubs",
  spades: "Spades",
};

export function CardSuitBand() {
  const unlocked = useIsScenarioUnlocked(SCENARIO.key);
  const [pick, setPick] = useState<Suit | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Suit | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: balance } = useBalance();
  const attemptScenario = useAttemptScenario();
  const recordResult = useRecordScenarioResult();
  const unlockScenario = useUnlockScenario();

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const canAffordUnlock = balance >= SCENARIO.unlockCost;
  const canAffordAttempt = balance >= SCENARIO.attemptCost;

  async function handleUnlock() {
    if (!canAffordUnlock) return;
    try {
      await unlockScenario.mutateAsync({
        scenarioKey: SCENARIO.key,
        unlockCost: SCENARIO.unlockCost,
      });
    } catch {
      // Refused (shouldn't happen — the button is disabled when unaffordable).
    }
  }

  async function handleDraw() {
    if (!pick || phase === "drawing" || !canAffordAttempt) return;

    audioManager.play("click");

    try {
      await attemptScenario.mutateAsync({ scenarioKey: SCENARIO.key, cost: SCENARIO.attemptCost });
    } catch {
      return;
    }

    setPhase("drawing");

    const settle = async () => {
      const outcome = drawSuit();
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
        // Balance/stat sync failed; the draw itself already resolved for the player.
      }
    };

    if (reducedMotion) {
      void settle();
    } else {
      timeoutRef.current = setTimeout(() => void settle(), DRAW_DURATION_MS);
    }
  }

  function handleDrawAgain() {
    setPick(null);
    setPhase("idle");
    setResult(null);
  }

  if (!unlocked) {
    return (
      <section className="flex min-h-[78vh] w-full flex-col items-center justify-center gap-6 bg-forest px-4 py-16 text-on-dark">
        <h1 className="text-center font-display text-5xl leading-none opacity-60 sm:text-7xl">
          Scenario 3
        </h1>
        <p className="font-sans text-sm uppercase tracking-widest opacity-60">
          Card suit · 1/4 odds · 4 points
        </p>
        <div className="flex aspect-[5/7] w-40 flex-col items-center justify-center gap-3 border-2 border-on-dark/40 px-4 text-center opacity-60 sm:w-52">
          <LockIcon className="h-8 w-8" />
          <span className="font-sans text-xs uppercase tracking-widest">Locked</span>
        </div>
        <button
          type="button"
          disabled={!canAffordUnlock}
          onClick={() => void handleUnlock()}
          className="border-2 border-on-dark px-10 py-3 font-sans text-sm uppercase tracking-widest disabled:opacity-50"
        >
          Unlock for {SCENARIO.unlockCost} points
        </button>
        <p className="font-sans text-xs uppercase tracking-widest text-on-dark/70">
          Balance: {balance}
        </p>
      </section>
    );
  }

  const rotation = phase === "drawing" ? 1800 : phase === "result" ? 180 : 0;

  return (
    <section className="flex min-h-[78vh] w-full flex-col items-center justify-center gap-8 bg-forest px-4 py-16 text-on-dark">
      <h1 className="text-center font-display text-5xl leading-none sm:text-7xl">Scenario 3</h1>
      <p className="font-sans text-sm uppercase tracking-widest">Card suit · 1/4 odds · 4 points</p>

      <div className="[perspective:800px]">
        <div
          aria-live="polite"
          className="flex aspect-[5/7] w-40 flex-col items-center justify-center gap-2 border-2 border-on-dark px-4 text-center font-display text-xl transition-transform duration-[900ms] ease-out sm:w-52 sm:text-2xl"
          style={reducedMotion ? undefined : { transform: `rotateY(${rotation}deg)` }}
        >
          {phase === "result" && result ? (
            <>
              <SuitIcon suit={result} className="h-10 w-10 sm:h-12 sm:w-12" />
              <span>{suitLabel[result]}</span>
            </>
          ) : pick ? (
            `Picked: ${suitLabel[pick]}`
          ) : (
            "Pick a suit"
          )}
        </div>
      </div>

      <div role="group" aria-label="Pick a suit" className="flex flex-wrap justify-center gap-3">
        {SUITS.map((suit) => (
          <button
            key={suit}
            type="button"
            disabled={phase === "drawing"}
            aria-pressed={pick === suit}
            onClick={() => setPick(suit)}
            className={`flex items-center gap-2 border-2 border-on-dark px-4 py-3 font-sans text-sm uppercase tracking-widest ${
              pick === suit ? "bg-on-dark text-forest" : ""
            }`}
          >
            <SuitIcon suit={suit} className="h-4 w-4" />
            {suitLabel[suit]}
          </button>
        ))}
      </div>

      {phase === "result" ? (
        <div className="flex flex-col items-center gap-4">
          <p className="font-sans text-sm uppercase tracking-widest">
            {result === pick ? "You won — +4 points" : "You lost"}
          </p>
          <button
            type="button"
            onClick={handleDrawAgain}
            className="border-2 border-on-dark px-10 py-3 font-sans text-sm uppercase tracking-widest"
          >
            Draw again
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={!pick || phase === "drawing" || !canAffordAttempt}
          onClick={() => void handleDraw()}
          className="border-2 border-on-dark px-10 py-3 font-sans text-sm uppercase tracking-widest disabled:opacity-50"
        >
          {phase === "drawing" ? "Drawing…" : `Draw (${SCENARIO.attemptCost} pts)`}
        </button>
      )}

      <p className="font-sans text-xs uppercase tracking-widest text-on-dark/70">
        Balance: {balance}
      </p>
    </section>
  );
}

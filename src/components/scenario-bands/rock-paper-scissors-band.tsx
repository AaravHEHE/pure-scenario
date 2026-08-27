import { useEffect, useRef, useState } from "react";

import { audioManager } from "@/lib/audio-manager";
import {
  randomThrow,
  resolveThrow,
  THROWS,
  type Throw,
  type ThrowOutcome,
} from "@/lib/rock-paper-scissors";
import { useAttemptScenario, useBalance, useRecordScenarioResult } from "@/hooks/use-game-data";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SCENARIOS } from "@/lib/scenarios";

const SCENARIO = SCENARIOS["rock-paper-scissors"];
const SUSPENSE_MS = 500;

type Phase = "idle" | "suspense" | "result";

const throwLabel: Record<Throw, string> = { rock: "Rock", paper: "Paper", scissors: "Scissors" };

export function RockPaperScissorsBand() {
  const [pick, setPick] = useState<Throw | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [rngThrow, setRngThrow] = useState<Throw | null>(null);
  const [outcome, setOutcome] = useState<ThrowOutcome | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: balance } = useBalance();
  const attemptScenario = useAttemptScenario();
  const recordResult = useRecordScenarioResult();

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  async function handleThrow() {
    if (!pick || phase === "suspense") return;

    audioManager.play("click");

    try {
      await attemptScenario.mutateAsync({ scenarioKey: SCENARIO.key, cost: SCENARIO.attemptCost });
    } catch {
      return;
    }

    setPhase("suspense");

    const reveal = async () => {
      const rng = randomThrow();
      const result = resolveThrow(pick, rng);
      setRngThrow(rng);
      setOutcome(result);
      setPhase("result");
      audioManager.play(result === "win" ? "win" : "lose");

      try {
        await recordResult.mutateAsync({
          scenarioKey: SCENARIO.key,
          won: result === "win",
          points: result === "win" ? SCENARIO.winPoints : 0,
        });
      } catch {
        // Balance/stat sync failed; the throw itself already resolved for the player.
      }
    };

    if (reducedMotion) {
      void reveal();
    } else {
      timeoutRef.current = setTimeout(() => void reveal(), SUSPENSE_MS);
    }
  }

  function handlePlayAgain() {
    setPick(null);
    setPhase("idle");
    setRngThrow(null);
    setOutcome(null);
  }

  return (
    <section className="flex min-h-[78vh] w-full flex-col items-center justify-center gap-8 bg-mustard px-4 py-16 text-on-light">
      <h1 className="text-center font-display text-5xl leading-none sm:text-7xl">Scenario 2</h1>
      <p className="font-sans text-sm uppercase tracking-widest">
        Rock paper scissors vs RNG · 1/3 odds · 2 points
      </p>

      <div aria-live="polite" className="flex items-center gap-6 sm:gap-10">
        <div className="flex flex-col items-center gap-2">
          <span className="font-sans text-xs uppercase tracking-widest">You</span>
          <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-on-light px-2 text-center font-display text-xl sm:h-36 sm:w-36 sm:text-2xl">
            {pick ? throwLabel[pick] : "?"}
          </div>
        </div>

        <span className="font-display text-2xl">vs</span>

        <div className="flex flex-col items-center gap-2">
          <span className="font-sans text-xs uppercase tracking-widest">RNG</span>
          <div
            className={`flex h-28 w-28 items-center justify-center rounded-full border-2 border-on-light px-2 text-center font-display text-xl sm:h-36 sm:w-36 sm:text-2xl ${
              reducedMotion ? "" : "transition-all duration-300 ease-out"
            } ${phase === "result" ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}
          >
            {phase === "result" && rngThrow ? throwLabel[rngThrow] : ""}
          </div>
        </div>
      </div>

      <div role="group" aria-label="Pick rock, paper, or scissors" className="flex gap-4">
        {THROWS.map((throwOption) => (
          <button
            key={throwOption}
            type="button"
            disabled={phase === "suspense"}
            aria-pressed={pick === throwOption}
            onClick={() => setPick(throwOption)}
            className={`border-2 border-on-light px-6 py-3 font-sans text-sm uppercase tracking-widest ${
              pick === throwOption ? "bg-on-light text-mustard" : ""
            }`}
          >
            {throwLabel[throwOption]}
          </button>
        ))}
      </div>

      {phase === "result" ? (
        <div className="flex flex-col items-center gap-4">
          <p className="font-sans text-sm uppercase tracking-widest">
            {outcome === "win" ? "You won — +2 points" : "You lost"}
          </p>
          <button
            type="button"
            onClick={handlePlayAgain}
            className="border-2 border-on-light px-10 py-3 font-sans text-sm uppercase tracking-widest"
          >
            Throw again
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={!pick || phase === "suspense"}
          onClick={() => void handleThrow()}
          className="border-2 border-on-light px-10 py-3 font-sans text-sm uppercase tracking-widest disabled:opacity-50"
        >
          {phase === "suspense" ? "Revealing…" : "Throw"}
        </button>
      )}

      <p className="font-sans text-xs uppercase tracking-widest text-on-light/70">
        Balance: {balance ?? 0}
      </p>
    </section>
  );
}

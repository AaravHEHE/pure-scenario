import { useEffect, useRef, useState, type CSSProperties } from "react";

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
import { BalanceChip } from "@/components/scenario-bands/balance-chip";
import { BandSubtitle } from "@/components/scenario-bands/band-subtitle";

const SCENARIO = SCENARIOS["card-suit"];
const DRAW_DURATION_MS = 900;
// Every draw starts from 0deg and lands here: 5.5 turns, so the back face (which
// carries the drawn suit) ends up toward the viewer. Never accumulates across draws.
const SPIN_DEGREES = 1980;
const CARD_THICKNESS_PX = 4;
// Solid layers stacked between the two faces form the card's edge mid-spin.
const EDGE_OFFSETS_PX = Array.from(
  { length: CARD_THICKNESS_PX - 1 },
  (_, i) => i - (CARD_THICKNESS_PX - 2) / 2,
);

type Phase = "idle" | "drawing" | "result";

interface PlayedDraw {
  pick: Suit;
  outcome: Suit;
}

const suitLabel: Record<Suit, string> = {
  hearts: "Hearts",
  diamonds: "Diamonds",
  clubs: "Clubs",
  spades: "Spades",
};

const hiddenBackface: CSSProperties = {
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
};

const faceClass =
  "absolute inset-0 flex flex-col items-center justify-center gap-2 border-2 border-on-forest bg-forest px-4 text-center font-display text-xl sm:text-2xl";

export function CardSuitBand() {
  const unlocked = useIsScenarioUnlocked(SCENARIO.key);
  const [pick, setPick] = useState<Suit | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  // Snapshot of what was actually played, taken when the draw is triggered.
  // Everything on the result screen reads from this, never from `pick`.
  const [played, setPlayed] = useState<PlayedDraw | null>(null);
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
    if (!pick || phase !== "idle" || !canAffordAttempt) return;
    const pickedSuit = pick;

    audioManager.play("click");

    try {
      await attemptScenario.mutateAsync({ scenarioKey: SCENARIO.key, cost: SCENARIO.attemptCost });
    } catch {
      return;
    }

    // Decided now, at the moment of the draw — not in advance.
    const outcome = drawSuit();
    const won = outcome === pickedSuit;

    setPlayed({ pick: pickedSuit, outcome });
    setPhase("drawing");

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
        // Balance/stat sync failed; the draw itself already resolved for the player.
      }
    };

    if (reducedMotion) {
      void reveal();
    } else {
      timeoutRef.current = setTimeout(() => void reveal(), DRAW_DURATION_MS);
    }
  }

  function handleDrawAgain() {
    setPick(null);
    setPhase("idle");
    setPlayed(null);
  }

  if (!unlocked) {
    return (
      <section className="relative flex min-h-[78vh] w-full flex-col items-center justify-center bg-forest px-4 py-16 text-on-locked">
        {/* The dimmed look comes from this scrim, never from fading text. */}
        <div aria-hidden="true" className="absolute inset-0 bg-locked-scrim" />
        <div className="relative flex flex-col items-center gap-6">
          <h1 className="text-center font-display text-5xl leading-none sm:text-7xl">Scenario 3</h1>
          <BandSubtitle>Card suit · 1/4 odds · 4 points</BandSubtitle>
          <div className="flex aspect-[5/7] w-40 flex-col items-center justify-center gap-3 border-2 border-on-locked/40 px-4 text-center sm:w-52">
            <LockIcon className="h-8 w-8" />
            <span className="font-sans text-xs uppercase tracking-widest">Locked</span>
          </div>
          <button
            type="button"
            disabled={!canAffordUnlock}
            onClick={() => void handleUnlock()}
            className="border-2 border-on-locked px-10 py-3 font-sans text-sm uppercase tracking-widest disabled:cursor-not-allowed disabled:border-dashed"
          >
            Unlock for {SCENARIO.unlockCost} points
          </button>
          <BalanceChip balance={balance} />
        </div>
      </section>
    );
  }

  // Idle snaps back to 0deg with no transition, so the prompt is always on the
  // front face, right-reading, and the next draw starts from the same baseline.
  const rotation = phase === "idle" ? 0 : SPIN_DEGREES;
  const animating = phase === "drawing" && !reducedMotion;
  const won = played !== null && played.outcome === played.pick;
  const shownPick = played?.pick ?? pick;

  const frontText = shownPick ? `Picked: ${suitLabel[shownPick]}` : "Pick a suit";

  return (
    <section className="flex min-h-[78vh] w-full flex-col items-center justify-center gap-8 bg-forest px-4 py-16 text-on-forest">
      <h1 className="text-center font-display text-5xl leading-none sm:text-7xl">Scenario 3</h1>
      <BandSubtitle>Card suit · 1/4 odds · 4 points</BandSubtitle>

      <div className="[perspective:800px]">
        <div
          aria-live="polite"
          // Purely visual. Edge-on 3D planes hit-test unpredictably in Chrome and
          // were measured intercepting clicks meant for the buttons below.
          className={`pointer-events-none relative aspect-[5/7] w-40 sm:w-52 ${
            animating ? "transition-transform duration-[900ms] ease-out" : ""
          }`}
          style={{ transformStyle: "preserve-3d", transform: `rotateY(${rotation}deg)` }}
        >
          {EDGE_OFFSETS_PX.map((z) => (
            <div
              key={z}
              aria-hidden="true"
              className="absolute inset-0 bg-on-forest"
              style={{ transform: `translateZ(${z}px)` }}
            />
          ))}
          {/* The stacked layers vanish when exactly edge-on; this strip is the edge at 90deg. */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-1/2 bg-on-forest"
            style={{
              width: CARD_THICKNESS_PX,
              marginLeft: -CARD_THICKNESS_PX / 2,
              transform: "rotateY(90deg)",
            }}
          />

          <div
            data-face="front"
            aria-hidden={phase === "result"}
            className={faceClass}
            style={{ ...hiddenBackface, transform: `translateZ(${CARD_THICKNESS_PX / 2}px)` }}
          >
            {frontText}
          </div>
          <div
            data-face="back"
            aria-hidden={phase !== "result"}
            className={faceClass}
            style={{
              ...hiddenBackface,
              transform: `rotateY(180deg) translateZ(${CARD_THICKNESS_PX / 2}px)`,
            }}
          >
            {played && phase === "result" ? (
              <>
                <SuitIcon suit={played.outcome} className="h-10 w-10 sm:h-12 sm:w-12" />
                <span>{suitLabel[played.outcome]}</span>
              </>
            ) : played ? (
              // Mid-draw the back face repeats the pick so the suit can't leak before the reveal.
              `Picked: ${suitLabel[played.pick]}`
            ) : null}
          </div>
        </div>
      </div>

      <div role="group" aria-label="Pick a suit" className="flex flex-wrap justify-center gap-3">
        {SUITS.map((suit) => (
          <button
            key={suit}
            type="button"
            disabled={phase !== "idle"}
            aria-pressed={shownPick === suit}
            onClick={() => setPick(suit)}
            className={`flex items-center gap-2 border-2 border-on-forest px-4 py-3 font-sans text-sm uppercase tracking-widest ${
              shownPick === suit ? "bg-on-forest text-forest" : ""
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
            {won ? "You won — +4 points" : "You lost"}
          </p>
          <button
            type="button"
            onClick={handleDrawAgain}
            className="border-2 border-on-forest px-10 py-3 font-sans text-sm uppercase tracking-widest"
          >
            Draw again
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={!pick || phase === "drawing" || !canAffordAttempt}
          onClick={() => void handleDraw()}
          className="border-2 border-on-forest px-10 py-3 font-sans text-sm uppercase tracking-widest disabled:opacity-50"
        >
          {phase === "drawing" ? "Drawing…" : `Draw (${SCENARIO.attemptCost} pts)`}
        </button>
      )}

      <BalanceChip balance={balance} />
    </section>
  );
}

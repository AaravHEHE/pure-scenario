import { useEffect, useRef, type ReactNode } from "react";

import { useAttemptScenario, useRecordScenarioResult } from "@/hooks/use-game-data";
import type { ScenarioKey } from "@/lib/scenarios";

export interface Play {
  scenarioKey: ScenarioKey;
  won: boolean;
}

/** Plays through the real in-memory data layer once on mount, like a guest would. */
export function PlayedSession({ plays, children }: { plays: Play[]; children: ReactNode }) {
  const attempt = useAttemptScenario();
  const record = useRecordScenarioResult();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    for (const { scenarioKey, won } of plays) {
      void attempt.mutateAsync({ scenarioKey });
      void record.mutateAsync({ scenarioKey, won, points: 0 });
    }
  }, [attempt, record, plays]);
  return <>{children}</>;
}

export const repeat = (count: number, play: Play): Play[] =>
  Array.from({ length: count }, () => play);

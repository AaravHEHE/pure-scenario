import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const attemptMutateAsync = vi.fn().mockResolvedValue(undefined);
const recordMutateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/use-game-data", () => ({
  useBalance: () => ({ data: 5 }),
  useAttemptScenario: () => ({ mutateAsync: attemptMutateAsync }),
  useRecordScenarioResult: () => ({ mutateAsync: recordMutateAsync }),
}));

import { RockPaperScissorsBand } from "@/components/scenario-bands/rock-paper-scissors-band";

beforeEach(() => {
  attemptMutateAsync.mockClear();
  recordMutateAsync.mockClear();
  // prefers-reduced-motion: reduce — so the reveal resolves synchronously.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

describe("RockPaperScissorsBand", () => {
  it("requires a pick before the throw button is enabled", () => {
    render(<RockPaperScissorsBand />);

    expect(screen.getByRole("button", { name: /^throw$/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Rock" }));

    expect(screen.getByRole("button", { name: /^throw$/i })).toBeEnabled();
  });

  it("attempts with no cost, then records a result with scenarioKey rock-paper-scissors", async () => {
    render(<RockPaperScissorsBand />);

    fireEvent.click(screen.getByRole("button", { name: "Paper" }));
    fireEvent.click(screen.getByRole("button", { name: /^throw$/i }));

    expect(attemptMutateAsync).toHaveBeenCalledWith({
      scenarioKey: "rock-paper-scissors",
      cost: 0,
    });

    await waitFor(() => expect(recordMutateAsync).toHaveBeenCalledTimes(1));
    expect(recordMutateAsync.mock.calls[0]?.[0]).toMatchObject({
      scenarioKey: "rock-paper-scissors",
    });
    // Win points for this band are 2, per the ladder — win/loss depends on the random draw,
    // but if it won, it must have paid out exactly 2.
    const call = recordMutateAsync.mock.calls[0]?.[0] as { won: boolean; points: number };
    expect(call.points).toBe(call.won ? 2 : 0);
  });

  it("resets to idle on Throw again", async () => {
    render(<RockPaperScissorsBand />);

    fireEvent.click(screen.getByRole("button", { name: "Scissors" }));
    fireEvent.click(screen.getByRole("button", { name: /^throw$/i }));
    await waitFor(() => expect(recordMutateAsync).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /throw again/i }));

    expect(screen.getByRole("button", { name: /^throw$/i })).toBeDisabled();
  });
});

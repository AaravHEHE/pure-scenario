import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const attemptMutateAsync = vi.fn().mockResolvedValue(undefined);
const recordMutateAsync = vi.fn().mockResolvedValue(undefined);
const unlockMutateAsync = vi.fn().mockResolvedValue(undefined);
let balance = 0;
let cardUnlocked = false;

vi.mock("@/hooks/use-game-data", () => ({
  useBalance: () => ({ data: balance }),
  useIsScenarioUnlocked: () => cardUnlocked,
  useAttemptScenario: () => ({ mutateAsync: attemptMutateAsync }),
  useRecordScenarioResult: () => ({ mutateAsync: recordMutateAsync }),
  useUnlockScenario: () => ({ mutateAsync: unlockMutateAsync }),
}));

import { CardSuitBand } from "@/components/scenario-bands/card-suit-band";

beforeEach(() => {
  attemptMutateAsync.mockClear();
  recordMutateAsync.mockClear();
  unlockMutateAsync.mockClear();
  balance = 0;
  cardUnlocked = false;
  // prefers-reduced-motion: reduce — so the reveal resolves synchronously.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

describe("CardSuitBand — locked state", () => {
  it("shows locked with the unlock button disabled when unaffordable", () => {
    balance = 10;
    render(<CardSuitBand />);

    expect(screen.getByText("Locked")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unlock for 25 points/i })).toBeDisabled();
  });

  it("enables the unlock button once affordable", () => {
    balance = 25;
    render(<CardSuitBand />);

    expect(screen.getByRole("button", { name: /unlock for 25 points/i })).toBeEnabled();
  });

  it("spends the unlock cost through useUnlockScenario when clicked", () => {
    balance = 25;
    render(<CardSuitBand />);

    fireEvent.click(screen.getByRole("button", { name: /unlock for 25 points/i }));

    expect(unlockMutateAsync).toHaveBeenCalledWith({ scenarioKey: "card-suit", unlockCost: 25 });
  });

  it("does not show the play interface while locked", () => {
    balance = 100;
    render(<CardSuitBand />);

    expect(screen.queryByRole("group", { name: /pick a suit/i })).not.toBeInTheDocument();
  });
});

describe("CardSuitBand — unlocked state", () => {
  it("disables the draw button when unaffordable, even with a suit picked", () => {
    cardUnlocked = true;
    balance = 2; // less than the 4-point attempt cost
    render(<CardSuitBand />);

    fireEvent.click(screen.getByRole("button", { name: "Hearts" }));

    expect(screen.getByRole("button", { name: /draw/i })).toBeDisabled();
  });

  it("requires a pick before the draw button is enabled, when affordable", () => {
    cardUnlocked = true;
    balance = 50;
    render(<CardSuitBand />);

    expect(screen.getByRole("button", { name: /draw/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Spades" }));

    expect(screen.getByRole("button", { name: /draw/i })).toBeEnabled();
  });

  it("attempts, then records a result, then offers Draw again", async () => {
    cardUnlocked = true;
    balance = 50;
    render(<CardSuitBand />);

    fireEvent.click(screen.getByRole("button", { name: "Clubs" }));
    fireEvent.click(screen.getByRole("button", { name: /draw/i }));

    expect(attemptMutateAsync).toHaveBeenCalledWith({ scenarioKey: "card-suit", cost: 4 });

    await waitFor(() => expect(recordMutateAsync).toHaveBeenCalledTimes(1));
    const call = recordMutateAsync.mock.calls[0]?.[0] as {
      scenarioKey: string;
      won: boolean;
      points: number;
    };
    expect(call.scenarioKey).toBe("card-suit");
    expect(call.points).toBe(call.won ? 4 : 0);

    expect(screen.getByRole("button", { name: /draw again/i })).toBeInTheDocument();
  });

  it("never shows the locked view once unlocked, even at 0 balance", () => {
    cardUnlocked = true;
    balance = 0;
    render(<CardSuitBand />);

    expect(screen.queryByText("Locked")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: /pick a suit/i })).toBeInTheDocument();
  });
});

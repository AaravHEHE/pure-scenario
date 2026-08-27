import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const attemptMutateAsync = vi.fn().mockResolvedValue(undefined);
const recordMutateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/use-game-data", () => ({
  useBalance: () => ({ data: 3 }),
  useAttemptScenario: () => ({ mutateAsync: attemptMutateAsync }),
  useRecordScenarioResult: () => ({ mutateAsync: recordMutateAsync }),
}));

import { CoinFlipBand } from "@/components/scenario-bands/coin-flip-band";

beforeEach(() => {
  attemptMutateAsync.mockClear();
  recordMutateAsync.mockClear();
  // prefers-reduced-motion: reduce — so the result resolves synchronously.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

describe("CoinFlipBand", () => {
  it("requires a pick before the flip button is enabled", () => {
    render(<CoinFlipBand />);

    expect(screen.getByRole("button", { name: /flip/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Heads" }));

    expect(screen.getByRole("button", { name: /flip/i })).toBeEnabled();
  });

  it("attempts then records a result, and shows a Flip again control", async () => {
    render(<CoinFlipBand />);

    fireEvent.click(screen.getByRole("button", { name: "Heads" }));
    fireEvent.click(screen.getByRole("button", { name: /flip/i }));

    expect(attemptMutateAsync).toHaveBeenCalledWith({ scenarioKey: "coin-flip", cost: 0 });

    await waitFor(() => expect(recordMutateAsync).toHaveBeenCalledTimes(1));
    expect(recordMutateAsync.mock.calls[0]?.[0]).toMatchObject({ scenarioKey: "coin-flip" });

    expect(screen.getByRole("button", { name: /flip again/i })).toBeInTheDocument();
  });

  it("resets to idle on Flip again", async () => {
    render(<CoinFlipBand />);

    fireEvent.click(screen.getByRole("button", { name: "Tails" }));
    fireEvent.click(screen.getByRole("button", { name: /flip/i }));
    await waitFor(() => expect(recordMutateAsync).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /flip again/i }));

    expect(screen.getByText("Pick a side")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^flip$/i })).toBeDisabled();
  });
});

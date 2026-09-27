import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const game = vi.hoisted(() => ({ balance: 0, unlocked: false }));
const attemptMutateAsync = vi.fn().mockResolvedValue(undefined);
const unlockMutateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/use-game-data", () => ({
  useBalance: () => ({ data: game.balance }),
  useIsScenarioUnlocked: () => game.unlocked,
  useAttemptScenario: () => ({ mutateAsync: attemptMutateAsync }),
  useRecordScenarioResult: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) }),
  useUnlockScenario: () => ({ mutateAsync: unlockMutateAsync }),
}));

import { CardSuitBand } from "@/components/scenario-bands/card-suit-band";

beforeEach(() => {
  attemptMutateAsync.mockClear();
  unlockMutateAsync.mockClear();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

const unlockButton = () => screen.getByRole("button", { name: /unlock for 25 points/i });
const drawButton = () => screen.getByRole("button", { name: /^draw \(4 pts\)$/i });

/** The tooltip is in the DOM (hidden) while unaffordable, so it can describe the button. */
function expectCostTooltip(button: HTMLElement, text: string) {
  const tooltip = screen.getByRole("tooltip", { hidden: true });
  expect(tooltip).toHaveTextContent(text);
  expect(button).toHaveAttribute("aria-describedby", tooltip.id);
  expect(button).toHaveAccessibleDescription(text);
  return tooltip;
}

describe.each([
  {
    name: "unlock button (locked band)",
    unlocked: false,
    afterRender: () => {},
    button: unlockButton,
    shortBalance: 10,
    enoughBalance: 25,
    text: "Needs 25 points — you have 10",
    spend: unlockMutateAsync,
  },
  {
    name: "attempt button (card suit, 4 pt attempt cost)",
    unlocked: true,
    // Pick a suit, so cost is the only thing standing between the player and a draw.
    afterRender: () => fireEvent.click(screen.getByRole("button", { name: "Hearts" })),
    button: drawButton,
    shortBalance: 2,
    enoughBalance: 4,
    text: "Needs 4 points — you have 2",
    spend: attemptMutateAsync,
  },
])(
  "$name cost tooltip",
  ({ unlocked, afterRender, button, shortBalance, enoughBalance, text, spend }) => {
    function renderWith(balance: number) {
      game.balance = balance;
      game.unlocked = unlocked;
      render(<CardSuitBand />);
      afterRender();
    }

    it("renders when the balance can't cover the cost, naming the cost and the balance", () => {
      renderWith(shortBalance);
      const tooltip = expectCostTooltip(button(), text);
      expect(tooltip).not.toBeVisible();
    });

    it("opens on keyboard focus and closes on Escape and blur", () => {
      renderWith(shortBalance);
      const b = button();
      fireEvent.focus(b);
      expect(screen.getByRole("tooltip")).toBeVisible();
      fireEvent.keyDown(b, { key: "Escape" });
      expect(screen.getByRole("tooltip", { hidden: true })).not.toBeVisible();
      fireEvent.focus(b);
      fireEvent.blur(b);
      expect(screen.getByRole("tooltip", { hidden: true })).not.toBeVisible();
    });

    it("opens on tap, stays open, spends nothing, and closes on a tap elsewhere", () => {
      renderWith(shortBalance);
      fireEvent.click(button());
      expect(screen.getByRole("tooltip")).toBeVisible();
      expect(spend).not.toHaveBeenCalled();
      fireEvent.pointerDown(document.body);
      expect(screen.getByRole("tooltip", { hidden: true })).not.toBeVisible();
    });

    it("opens on mouse hover and closes when the mouse leaves", () => {
      renderWith(shortBalance);
      const wrapper = button().parentElement!;
      fireEvent.pointerEnter(wrapper, { pointerType: "mouse" });
      expect(screen.getByRole("tooltip")).toBeVisible();
      fireEvent.pointerLeave(wrapper, { pointerType: "mouse" });
      expect(screen.getByRole("tooltip", { hidden: true })).not.toBeVisible();
    });

    it("does not render at all once the balance covers the cost", () => {
      renderWith(enoughBalance);
      const b = button();
      expect(b).toBeEnabled();
      expect(b).not.toHaveAttribute("aria-disabled");
      expect(b).not.toHaveAttribute("aria-describedby");
      fireEvent.focus(b);
      fireEvent.pointerEnter(b.parentElement!, { pointerType: "mouse" });
      expect(screen.queryByRole("tooltip", { hidden: true })).not.toBeInTheDocument();
    });
  },
);

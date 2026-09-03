export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export const SUITS: readonly Suit[] = ["hearts", "diamonds", "clubs", "spades"];

/** A uniformly random suit, drawn at call time — never decided in advance. */
export function drawSuit(): Suit {
  const roll = Math.floor(Math.random() * 4);
  switch (roll) {
    case 0:
      return "hearts";
    case 1:
      return "diamonds";
    case 2:
      return "clubs";
    default:
      return "spades";
  }
}

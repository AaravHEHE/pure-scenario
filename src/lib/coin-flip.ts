export type CoinSide = "heads" | "tails";

/** A fair 50/50 draw, made at call time — never decided in advance. */
export function flipCoin(): CoinSide {
  return Math.random() < 0.5 ? "heads" : "tails";
}

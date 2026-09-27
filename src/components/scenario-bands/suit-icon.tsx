import type { Suit } from "@/lib/card-suit";

interface SuitIconProps {
  suit: Suit;
  className?: string;
}

export function SuitIcon({ suit, className }: SuitIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      {suit === "hearts" && (
        <path d="M12,21 C12,21 3,14 3,8.5 C3,5.42 5.42,3 8.5,3 C10.24,3 11.5,3.81 12,5 C12.5,3.81 13.76,3 15.5,3 C18.58,3 21,5.42 21,8.5 C21,14 12,21 12,21 Z" />
      )}
      {suit === "diamonds" && <polygon points="12,2 21,12 12,22 3,12" />}
      {suit === "clubs" && (
        <>
          <circle cx="12" cy="9" r="4.2" />
          <circle cx="7.2" cy="14" r="4.2" />
          <circle cx="16.8" cy="14" r="4.2" />
          <path d="M10.2,16 L13.8,16 L12.6,23 L11.4,23 Z" />
        </>
      )}
      {suit === "spades" && (
        // One path: pointed top, two lobes, and a stem that flares out at the base.
        // A stem that tapers instead reads as a teardrop at 16px.
        <path d="M12,1.5 C12,1.5 2.5,8.5 2.5,14 C2.5,16.9 4.7,19 7.3,19 C8.9,19 10.2,18.3 11,17.2 C10.9,19.4 10.2,21.2 8.5,22.5 L15.5,22.5 C13.8,21.2 13.1,19.4 13,17.2 C13.8,18.3 15.1,19 16.7,19 C19.3,19 21.5,16.9 21.5,14 C21.5,8.5 12,1.5 12,1.5 Z" />
      )}
    </svg>
  );
}

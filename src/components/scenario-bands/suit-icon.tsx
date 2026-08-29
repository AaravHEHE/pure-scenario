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
        <>
          <path d="M12,2 C12,2 21,10 21,15.5 C21,18.58 18.58,21 15.5,21 C13.76,21 12.5,20.19 12,19 C11.5,20.19 10.24,21 8.5,21 C5.42,21 3,18.58 3,15.5 C3,10 12,2 12,2 Z" />
          <path d="M10.2,17 L13.8,17 L12.6,23 L11.4,23 Z" />
        </>
      )}
    </svg>
  );
}

import type { ReactNode } from "react";

// Centered explicitly so a subtitle that wraps on narrow screens stays centered
// like everything else in the band.
export function BandSubtitle({ children }: { children: ReactNode }) {
  return <p className="text-center font-sans text-sm uppercase tracking-widest">{children}</p>;
}

// Opaque on purpose: translucent text over band colors passes or fails AA
// depending on the band underneath. Ink on base is 16.68:1 on every band.
export function BalanceChip({ balance }: { balance: number }) {
  return (
    <p className="rounded-full bg-base px-3 py-1 font-sans text-xs uppercase tracking-widest text-ink">
      Balance: {balance}
    </p>
  );
}

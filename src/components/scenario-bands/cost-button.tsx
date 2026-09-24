import { useEffect, useId, useRef, useState, type ReactNode } from "react";

interface CostButtonProps {
  cost: number;
  balance: number;
  /** Disabled for reasons other than cost, e.g. no pick yet or mid-draw. */
  disabled?: boolean;
  onClick: () => void;
  className: string;
  children: ReactNode;
}

/**
 * A button that costs points. When the balance can't cover the cost it stays
 * focusable (aria-disabled rather than disabled) so the tooltip explaining why
 * can be reached by hover, keyboard focus and tap alike.
 */
export function CostButton({
  cost,
  balance,
  disabled = false,
  onClick,
  className,
  children,
}: CostButtonProps) {
  const unaffordable = balance < cost;
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);

  // Touch has no "hover out", so a tap anywhere else closes it.
  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [open]);

  const show = () => {
    if (unaffordable) setOpen(true);
  };

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex"
      onPointerEnter={(event) => event.pointerType === "mouse" && show()}
      onPointerLeave={(event) => event.pointerType === "mouse" && setOpen(false)}
    >
      <button
        type="button"
        disabled={disabled && !unaffordable}
        aria-disabled={unaffordable || undefined}
        aria-describedby={unaffordable ? tooltipId : undefined}
        onFocus={show}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
        onClick={() => (unaffordable ? show() : onClick())}
        className={className}
      >
        {children}
      </button>
      {unaffordable ? (
        <span
          id={tooltipId}
          role="tooltip"
          hidden={!open}
          className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap bg-ink px-3 py-2 font-sans text-xs text-on-dark"
        >
          Needs {cost} points — you have {balance}
        </span>
      ) : null}
    </span>
  );
}

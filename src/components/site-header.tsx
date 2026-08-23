import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { useSoundSettings } from "@/hooks/use-sound-settings";

const navLinks = [
  { to: "/stats", label: "Stats" },
  { to: "/leaderboard", label: "Leaderboard" },
] as const;

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundSettings();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-base">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="font-display text-2xl leading-none tracking-tight text-ink">
          purerandomness
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="font-sans text-sm uppercase tracking-widest text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={soundEnabled}
            onClick={toggleSound}
            className="hidden border px-3 py-2 font-sans text-xs uppercase tracking-widest text-ink sm:inline-flex"
          >
            Sound: {soundEnabled ? "On" : "Off"}
          </button>
          <button
            type="button"
            className="border bg-ink px-3 py-2 font-sans text-xs uppercase tracking-widest text-on-dark"
          >
            Sign in
          </button>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex border p-2 text-ink md:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              {menuOpen ? (
                <g stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="3" x2="15" y2="15" />
                  <line x1="15" y1="3" x2="3" y2="15" />
                </g>
              ) : (
                <g stroke="currentColor" strokeWidth="2">
                  <line x1="2" y1="5" x2="16" y2="5" />
                  <line x1="2" y1="9" x2="16" y2="9" />
                  <line x1="2" y1="13" x2="16" y2="13" />
                </g>
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav className="flex flex-col border-t md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="border-b px-4 py-3 font-sans text-sm uppercase tracking-widest text-ink"
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            aria-pressed={soundEnabled}
            onClick={toggleSound}
            className="px-4 py-3 text-left font-sans text-xs uppercase tracking-widest text-ink sm:hidden"
          >
            Sound: {soundEnabled ? "On" : "Off"}
          </button>
        </nav>
      ) : null}
    </header>
  );
}

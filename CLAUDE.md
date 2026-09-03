# CLAUDE.md — Pure Randomness

This file is read by Claude Code at the start of every session in this repo.
Follow it exactly. If something you're about to do isn't covered here, stop
and ask instead of guessing.

## The three rules (non-negotiable)

1. **DO NOT INCLUDE THINGS WITHOUT ASKING.** No extra components, pages,
   libraries, copy, or "nice to have" features that weren't explicitly
   requested in the current task. If you think something would improve the
   project, propose it and wait for a yes.
2. **DO NOT FINISH THINGS WITHOUT TESTING.** Before declaring any task done:
   run `npm run test:run` and confirm it passes. For anything visual, describe
   what you checked at both a desktop and a mobile viewport width. Never say
   "done" without having actually run the tests.
3. **ASK FOLLOW-UP QUESTIONS.** To clarify ambiguity before building, and to
   suggest optimizations or new features after finishing a task — but always
   propose, never silently implement.

## Workflow

- This repo is edited from two places: Lovable's visual editor (for the
  human) and Claude Code (for you). **Always `git pull` at the start of a
  session** before making any change — Lovable may have pushed edits since
  your last session.
- Cosmetic changes (copy, colors, spacing) may happen in Lovable directly.
  Anything touching game logic, scoring, or data should go through you so
  tests stay meaningful.
- Commit in small, reviewable chunks. One scenario band, one feature, one
  commit — not a single giant commit for the whole ladder.

## Stack

React + Vite + TypeScript + Tailwind + shadcn/ui. Supabase for auth, database,
and Edge Functions. Vitest + Testing Library for tests. No animation or 3D
libraries (three.js, p5.js, Fabric.js, GSAP, etc.) — all motion is achievable
with CSS transforms and inline SVG, and pulling in a heavy library without
asking violates rule 1.

## Hard design rules (apply to every game in this series, not just this one)

Single fixed light theme. No dark mode, ever.

**Strictly banned, no exceptions:**
- Purple/blue/violet/indigo/neon-blue gradients, or gradients of any kind
- Blurry aurora glows or ambient radial glow backdrops
- Dark mode paired with neon accents
- The "hero headline + subtext + three identical feature cards" layout
- Bento-box rounded-rectangle grids
- Uniform excessive white space with no visual rhythm
- Default sans-serifs (Inter, Roboto) — this project uses Instrument Serif
  (display) and Public Sans (UI/body)
- Emojis used as icons — use inline SVG only
- Decorative hover/pulse/float/shimmer animations that don't guide the eye

Motion is reserved for the randomizer results themselves (coin flipping, dice
tumbling, reels spinning) — nowhere else. Respect `prefers-reduced-motion`.

## Design tokens

Defined as CSS custom properties and Tailwind theme tokens — never hardcode
hex values in components.

- Base background: `#FAF6EF`
- Band colors (flat fills only): tomato `#E2553D`, mustard `#E8A33D`,
  forest `#2F6B4F`, slate `#3D5A80`, clay `#B0552F`
- Text: `#1A1614` on light bands, `#FAF6EF` on dark bands — WCAG AA minimum
- Display/headline font: Instrument Serif
- UI/body font: Public Sans

## Site structure

Three routes only. No homepage.

- `/` — the game. Vertical scroll, one full-bleed band per scenario, ordered
  easiest to hardest. Same layout on mobile and desktop, just scaled.
- `/stats` — table: Scenario / Attempts / Wins / Losses
- `/leaderboard` — table: Rank / Player / Total Points (ranked by accumulated
  points, not win count)

Header on every route: wordmark (left), Stats + Leaderboard links (center),
Sign in button + sound on/off toggle (right, muted by default).

## The scenario ladder & economy

Every scenario needs its own animation and its own interactive element
(pick-before-reveal). Points and costs are hand-tuned, not formula-generated
at runtime — do not replace this table with a live calculation.

**Bands 1–2 are always free.** No unlock cost, no attempt cost, playable by
anyone including guests, forever.

**Bands 3–11 each require a one-time unlock cost, then a per-attempt cost
charged on every attempt (win or lose).**

| # | Scenario | Odds | Win pts | Unlock cost | Attempt cost |
|---|---|---|---|---|---|
| 1 | Coin flip | 1/2 | 1 | free | free |
| 2 | Rock paper scissors vs RNG | 1/3 | 2 | free | free |
| 3 | Card suit | 1/4 | 4 | 25 | 4 |
| 4 | Dice roll | 1/6 | 7 | 50 | 5 |
| 5 | Roulette number | 1/37 | 40 | 100 | 4 |
| 6 | Exact card from a deck | 1/52 | 50 | 150 | 4 |
| 7 | Minute in the hour | 1/60 | 75 | 250 | 5 |
| 8 | Number 1–100 | 1/100 | 125 | 400 | 5 |
| 9 | Slots, three matching | 1/1,000 | 1,500 | 750 | 6 |
| 10 | Legendary drop | 1/4,096 | 7,500 | 1,500 | 7 |
| 11 | Number 1–1,000,000 | 1/1,000,000 | 3,000,000 | 5,000 | 12 |

**Economy rules:**
- Balance can never go negative. Disable the attempt button (with a tooltip
  showing the cost) when the player can't afford a single attempt.
- New players/guests start at 0 points. The only way to afford unlocking
  band 3 is earning points on bands 1–2 first — and each subsequent unlock
  is funded the same way, by playing whatever's already unlocked.
- Once a band is unlocked, it **stays visibly unlocked** — never re-locks
  itself. Only the attempt button disables when the balance can't cover the
  attempt cost. A locked band looks visually dimmed and displays its unlock
  price; it does not look identical to an unlocked-but-unaffordable band.

## Guests vs. accounts — persistence

**Signed-in accounts persist everything, permanently, via Supabase:**
total point balance, total amount spent, every band ever unlocked, and
per-scenario attempts/wins/losses. This is the only source of truth for
`/stats` and `/leaderboard` for that user.

**Guests get none of this persisted.** Guest balance, unlocks, and stats
live in plain client-side state (React context/state) for the current page
load only. There is no localStorage guest ID and no server-side guest
record. Reloading or closing the tab erases everything for a guest, by
design.

**Sign-in transfer:** if a guest signs in during the same session, before
reloading, their current in-memory progress (balance, unlocks, stats)
transfers directly into their new account. There is no merge system beyond
this single in-session transfer — if the guest already reloaded, there is
nothing left to transfer.

**Guest reload-warning dialog:** show a warning every time a guest unlocks a
new paid band (unlock events only — not on regular attempts). It must
communicate that reloading or closing the tab will erase their progress,
including the unlock they just bought, and that signing in saves it
permanently. Include a checkbox to acknowledge and suppress further
warnings for the rest of the session (wording is flexible; the intent is
fixed). This dialog never appears for signed-in users.

## Auth & display name rules

- Google OAuth and email/password, both require email verification before
  the account is usable.
- After first successful login, the user must choose a display name for the
  leaderboard. Check it against a profanity blacklist and a uniqueness
  constraint — **both enforced server-side in an Edge Function**, never
  client-side only.
- Leaderboard inclusion requires a signed-in account. Guests never appear
  on it.

## Sound

Win, lose, and click sound effects. Build a stub audio manager now; actual
audio files land later in `/public/sounds/`. Muted by default — the header
toggle controls playback, never autoplay on load.

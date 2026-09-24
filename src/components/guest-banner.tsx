import { useRouterState } from "@tanstack/react-router";

import { useIsSignedIn } from "@/hooks/use-auth-status";

// Not dismissible: it describes the page's ongoing state for a guest, unlike
// the unlock warning dialog, which is about an action just taken.
const COPY: Record<string, string> = {
  "/stats":
    "You're playing as a guest. These stats aren't being saved — reloading or closing this tab erases them. Sign in to keep them permanently.",
  "/leaderboard":
    "You're playing as a guest, so you're not on the leaderboard. The dashed row is only a preview of where your score would place — it isn't a real rank, you aren't competing, and no one else can see it. Sign in to compete for real.",
};

export function GuestBanner() {
  const signedIn = useIsSignedIn();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const copy = COPY[pathname.replace(/\/+$/, "") || "/"];
  if (signedIn || !copy) return null;

  return (
    <div role="note" aria-label="Guest notice" className="w-full bg-tomato text-on-tomato">
      <p className="mx-auto w-full max-w-5xl px-4 py-3 font-sans text-sm sm:px-6">{copy}</p>
    </div>
  );
}

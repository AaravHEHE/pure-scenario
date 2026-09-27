import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

// Real AuthProvider, fake Supabase auth: a signed-in visitor is a stored,
// verified session, exactly as a returning player would have.
vi.mock(
  "@/lib/supabase",
  async () => (await import("./helpers/fake-supabase-auth")).supabaseModuleMock,
);

import { GuestBanner } from "@/components/guest-banner";
import { AuthProvider } from "@/hooks/use-auth";
import { GameDataProvider } from "@/hooks/use-game-data";
import { Route as LeaderboardRoute } from "@/routes/leaderboard";
import { Route as StatsRoute } from "@/routes/stats";
import {
  fakeAuth,
  resetFakeAuth,
  setLeaderboardRows,
  storeSessionHint,
  verifiedSession,
} from "@/test/helpers/fake-supabase-auth";
import { PlayedSession, repeat } from "@/test/helpers/guest-session";

function signInBeforeLoad() {
  storeSessionHint();
  fakeAuth.presetSession(verifiedSession());
}

function renderAt(path: string) {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <GuestBanner />
        <Outlet />
      </>
    ),
  });
  const page = (route: { options: unknown }, at: string) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path: at,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component: (route.options as any).component,
    });
  const home = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <p>home</p>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      home,
      page(StatsRoute, "/stats"),
      page(LeaderboardRoute, "/leaderboard"),
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <GameDataProvider>
          <PlayedSession plays={repeat(3, { scenarioKey: "coin-flip", won: true })}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <RouterProvider router={router as any} />
          </PlayedSession>
        </GameDataProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  resetFakeAuth();
  setLeaderboardRows([{ display_name: "Ada", total_points: 500 }]);
});

describe("guest banner", () => {
  it("shows the stats copy on /stats for a guest, with no way to dismiss it", async () => {
    renderAt("/stats");
    const banner = await screen.findByRole("note", { name: "Guest notice" });
    expect(banner).toHaveTextContent(/aren't being saved/);
    expect(banner).toHaveTextContent(/reloading or closing this tab erases them/);
    expect(banner).toHaveTextContent(/Sign in to keep them permanently/);
    expect(within(banner).queryByRole("button")).not.toBeInTheDocument();
    expect(within(banner).queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows different, leaderboard-specific copy on /leaderboard for a guest", async () => {
    renderAt("/leaderboard");
    const banner = await screen.findByRole("note", { name: "Guest notice" });
    expect(banner).toHaveTextContent(/not on the leaderboard/);
    expect(banner).toHaveTextContent(/isn't a real rank/);
    expect(banner).toHaveTextContent(/no one else can see it/);
    expect(banner).toHaveTextContent(/Sign in to compete for real/);
    expect(banner).not.toHaveTextContent(/aren't being saved/);
    expect(within(banner).queryByRole("button")).not.toBeInTheDocument();
    // And the guest row is there for the banner to refer to.
    expect(await screen.findByText("Guest")).toBeInTheDocument();
  });

  it("does not appear on the game page", async () => {
    renderAt("/");
    expect(await screen.findByText("home")).toBeInTheDocument();
    expect(screen.queryByRole("note", { name: "Guest notice" })).not.toBeInTheDocument();
  });

  it.each(["/stats", "/leaderboard"])("never appears on %s for a signed-in user", async (path) => {
    signInBeforeLoad();
    renderAt(path);
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    // Let the session settle, then check: never shown, not even while restoring.
    await waitFor(() => expect(fakeAuth.auth.onAuthStateChange).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByRole("note", { name: "Guest notice" })).not.toBeInTheDocument();
  });

  it("a signed-in user sees only real entries, with no guest preview row", async () => {
    signInBeforeLoad();
    renderAt("/leaderboard");
    expect(await screen.findByText("Ada")).toBeInTheDocument();
    expect(screen.queryByText("Guest")).not.toBeInTheDocument();
  });
});

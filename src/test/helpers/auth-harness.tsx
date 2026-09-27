import type React from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
type Page = () => React.ReactNode;

import { GuestBanner } from "@/components/guest-banner";
import { SiteHeader } from "@/components/site-header";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { GameDataProvider, useBalance, useRecordScenarioResult } from "@/hooks/use-game-data";
import { SoundSettingsProvider } from "@/hooks/use-sound-settings";

/** Shows the app-wide auth state and the game balance, and can win a coin flip. */
function Probe() {
  const auth = useAuth();
  const { data: balance } = useBalance();
  const record = useRecordScenarioResult();
  return (
    <div>
      <p data-testid="status">{auth.status}</p>
      <p data-testid="user">{auth.user?.email ?? "nobody"}</p>
      <p data-testid="balance">{balance}</p>
      <button
        type="button"
        onClick={() => void record.mutateAsync({ scenarioKey: "coin-flip", won: true, points: 1 })}
      >
        Win a flip
      </button>
    </div>
  );
}

/** The app's real provider stack and header, like __root.tsx, on a memory router. */
export function renderApp(path = "/", pages: Record<string, Page> = {}) {
  const rootRoute = createRootRoute({
    component: () => (
      <AuthProvider>
        <GameDataProvider>
          <SoundSettingsProvider>
            <SiteHeader />
            <GuestBanner />
            <Outlet />
          </SoundSettingsProvider>
        </GameDataProvider>
      </AuthProvider>
    ),
  });
  const routes = [
    createRoute({ getParentRoute: () => rootRoute, path: "/", component: Probe }),
    ...Object.entries(pages).map(([at, component]) =>
      createRoute({ getParentRoute: () => rootRoute, path: at, component }),
    ),
  ];
  const router = createRouter({
    routeTree: rootRoute.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <RouterProvider router={router as any} />
    </QueryClientProvider>,
  );
}

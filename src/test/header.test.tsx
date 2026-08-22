import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  Outlet,
} from "@tanstack/react-router";
import { SiteHeader } from "../components/site-header";

function buildRouter() {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <SiteHeader />
        <Outlet />
      </>
    ),
  });
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: () => null });
  const statsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/stats", component: () => null });
  const leaderboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/leaderboard",
    component: () => null,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([indexRoute, statsRoute, leaderboardRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
}

describe("SiteHeader", () => {
  it("renders the wordmark and links to Stats and Leaderboard", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<RouterProvider router={buildRouter() as any} />);

    expect(await screen.findByText("purerandomness")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Stats" })).toHaveAttribute("href", "/stats");
    expect(screen.getByRole("link", { name: "Leaderboard" })).toHaveAttribute(
      "href",
      "/leaderboard",
    );
  });
});

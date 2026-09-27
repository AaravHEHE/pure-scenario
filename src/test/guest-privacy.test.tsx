import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Every access to the Supabase client is recorded, including chained query
// builder calls and their arguments. The query resolves to fake real entries.
const supabaseCalls = vi.hoisted(() => [] as { path: string; args: unknown[] }[]);
vi.mock("@/integrations/supabase/client", () => {
  const REAL_ROWS = [
    { display_name: "Ada", total_points: 500 },
    { display_name: "Bo", total_points: 10 },
  ];
  const chain = (path: string): unknown =>
    new Proxy(() => {}, {
      get(_, prop) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void) => resolve({ data: REAL_ROWS, error: null });
        }
        return chain(`${path}.${String(prop)}`);
      },
      apply(_, __, args) {
        supabaseCalls.push({ path, args });
        return chain(path);
      },
    });
  return { supabase: chain("supabase") };
});
vi.mock("@/hooks/use-auth-status", () => ({ useIsSignedIn: () => false }));

import { GameDataProvider } from "@/hooks/use-game-data";
import { Route as LeaderboardRoute } from "@/routes/leaderboard";
import { Route as StatsRoute } from "@/routes/stats";
import { PlayedSession, repeat } from "@/test/helpers/guest-session";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LeaderboardPage = (LeaderboardRoute.options as any).component as ComponentType;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StatsPage = (StatsRoute.options as any).component as ComponentType;

// 9 coin wins x 1 + 7 RPS wins x 2 = 23 points: a number that appears nowhere
// in the fake real data, so any leak of it is detectable.
const GUEST_POINTS = 23;
const GUEST_PLAYS = [
  ...repeat(9, { scenarioKey: "coin-flip" as const, won: true }),
  ...repeat(7, { scenarioKey: "rock-paper-scissors" as const, won: true }),
  ...repeat(5, { scenarioKey: "coin-flip" as const, won: false }),
];

let fetchSpy: ReturnType<typeof vi.fn>;
let xhrSend: ReturnType<typeof vi.spyOn>;
let beacon: ReturnType<typeof vi.fn>;

beforeEach(() => {
  supabaseCalls.length = 0;
  fetchSpy = vi.fn(() => Promise.reject(new Error("network disabled in tests")));
  vi.stubGlobal("fetch", fetchSpy);
  xhrSend = vi.spyOn(XMLHttpRequest.prototype, "send");
  beacon = vi.fn(() => true);
  Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderAsGuest(Page: ComponentType) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <GameDataProvider>
        <PlayedSession plays={GUEST_PLAYS}>
          <Page />
        </PlayedSession>
      </GameDataProvider>
    </QueryClientProvider>,
  );
}

/** Everything that left (or could have left) the page, flattened to text. */
function everythingSent(): string {
  return JSON.stringify({
    supabase: supabaseCalls,
    fetch: fetchSpy.mock.calls,
    xhr: xhrSend.mock.calls,
    beacon: beacon.mock.calls,
  });
}

describe("the guest preview row never reaches Supabase or any server call", () => {
  it("renders the guest row from browser data while the only request is a read with no guest data", async () => {
    renderAsGuest(LeaderboardPage);

    // The preview row is really there: 23 points sits between Ada (500) and Bo (10).
    const guestRow = (await screen.findByText("Guest")).closest("tr")!;
    expect(
      within(guestRow)
        .getAllByRole("cell")
        .map((c) => c.textContent),
    ).toEqual(["2", "YouGuest", String(GUEST_POINTS)]);

    // Exactly one Supabase request, and it is the argument-free read.
    expect(supabaseCalls.map((c) => c.path)).toEqual([
      "supabase.from",
      "supabase.from.select",
      "supabase.from.select.order",
      "supabase.from.select.order.order",
    ]);
    expect(supabaseCalls[0]!.args).toEqual(["leaderboard_entries"]);
    expect(supabaseCalls[1]!.args).toEqual(["display_name, total_points"]);

    // No write, RPC, edge function, auth or storage call of any kind.
    expect(
      supabaseCalls.some((c) =>
        /insert|upsert|update|delete|rpc|functions|auth|storage|channel/.test(c.path),
      ),
    ).toBe(false);

    // Nothing sent anywhere contains the guest's score or any guest marker.
    const sent = everythingSent();
    expect(sent).not.toMatch(new RegExp(`\\b${GUEST_POINTS}\\b`));
    expect(sent).not.toMatch(/guest|preview|"You"/i);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSend).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
  });

  it("the /stats page makes no server calls at all", async () => {
    renderAsGuest(StatsPage);
    expect(await screen.findByRole("rowheader", { name: "Coin flip" })).toBeInTheDocument();
    expect(supabaseCalls).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSend).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
  });
});

import { vi } from "vitest";

import type { SessionLike } from "@/lib/auth";

// A stand-in for the Supabase client's auth API: no network, no real emails.
// Tests mock "@/lib/supabase" with `supabaseModuleMock`, then drive the
// session through `fakeAuth`.

type Listener = (event: string, session: SessionLike | null) => void;

export const verifiedSession = (email = "ada@example.com", id = "user-ada"): SessionLike => ({
  user: { id, email, email_confirmed_at: "2026-09-27T00:00:00Z" },
});

export const unverifiedSession = (email = "ada@example.com", id = "user-ada"): SessionLike => ({
  user: { id, email, email_confirmed_at: null },
});

function createFakeAuth() {
  let session: SessionLike | null = null;
  const listeners = new Set<Listener>();
  const emit = (event: string) => listeners.forEach((listener) => listener(event, session));

  const auth = {
    onAuthStateChange: vi.fn((listener: Listener) => {
      listeners.add(listener);
      // Like supabase-js: the current session arrives asynchronously.
      queueMicrotask(() => listener("INITIAL_SESSION", session));
      return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
    }),
    signUp: vi.fn(async ({ email }: { email: string }) => ({
      data: { user: unverifiedSession(email).user, session: null },
      error: null as { code?: string; message?: string } | null,
    })),
    signInWithPassword: vi.fn(async (_: { email: string; password: string }) => ({
      data: { user: null, session: null as SessionLike | null },
      error: { code: "invalid_credentials", message: "Invalid login credentials" } as {
        code?: string;
        message?: string;
      } | null,
    })),
    signInWithOAuth: vi.fn(async (_: unknown) => ({
      data: { provider: "google", url: "https://example.supabase.co/auth/v1/authorize" },
      error: null as { code?: string; message?: string } | null,
    })),
    signOut: vi.fn(async (_?: { scope?: string }) => {
      session = null;
      emit("SIGNED_OUT");
      return { error: null };
    }),
  };

  return {
    auth,
    /** Changes the session, as a sign-in or a verification link would. */
    setSession(next: SessionLike | null, event = next ? "SIGNED_IN" : "SIGNED_OUT") {
      session = next;
      emit(event);
    },
    /** Sets the session before anything subscribes (a returning visitor). */
    presetSession(next: SessionLike | null) {
      session = next;
    },
  };
}

export let fakeAuth = createFakeAuth();

// Real leaderboard rows served to fetchLeaderboard(), which also loads the
// client through loadSupabase().
let leaderboardRows: { display_name: string; total_points: number }[] = [];
export function setLeaderboardRows(rows: typeof leaderboardRows) {
  leaderboardRows = rows;
}
function from() {
  const query = {
    select: () => query,
    order: () => query,
    then: (resolve: (value: unknown) => void) => resolve({ data: leaderboardRows, error: null }),
  };
  return query;
}

export const loadSupabaseMock = vi.fn(async () => ({ supabase: { auth: fakeAuth.auth, from } }));
export const supabaseModuleMock = { loadSupabase: loadSupabaseMock };

export function resetFakeAuth() {
  fakeAuth = createFakeAuth();
  leaderboardRows = [];
  loadSupabaseMock.mockClear();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
}

/** What supabase-js leaves in storage for a returning visitor. */
export function storeSessionHint() {
  window.localStorage.setItem("sb-testproject-auth-token", "{}");
}

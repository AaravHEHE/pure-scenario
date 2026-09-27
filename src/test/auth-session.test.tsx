import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";

vi.mock(
  "@/lib/supabase",
  async () => (await import("./helpers/fake-supabase-auth")).supabaseModuleMock,
);

import { renderToString } from "react-dom/server";

import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { hasSessionHint, readAuthErrorFromUrl, toVerifiedUser } from "@/lib/auth";
import { renderApp } from "@/test/helpers/auth-harness";
import {
  fakeAuth,
  loadSupabaseMock,
  resetFakeAuth,
  storeSessionHint,
  unverifiedSession,
  verifiedSession,
} from "@/test/helpers/fake-supabase-auth";

beforeEach(() => {
  resetFakeAuth();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const status = () => screen.getByTestId("status").textContent;

describe("app-wide session state", () => {
  it("a guest with no sign of a session never loads Supabase (keeps Session E's startup win)", async () => {
    renderApp();
    await waitFor(() => expect(status()).toBe("guest"));
    expect(screen.getByTestId("user")).toHaveTextContent("nobody");
    expect(loadSupabaseMock).not.toHaveBeenCalled();
  });

  it("a returning, verified user is restored as signed in, with who they are", async () => {
    storeSessionHint();
    fakeAuth.presetSession(verifiedSession("grace@example.com", "user-grace"));
    renderApp();
    await waitFor(() => expect(status()).toBe("signed-in"));
    expect(screen.getByTestId("user")).toHaveTextContent("grace@example.com");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(loadSupabaseMock).toHaveBeenCalledTimes(1);
  });

  it("a stored but unverified session is treated as signed out", async () => {
    storeSessionHint();
    fakeAuth.presetSession(unverifiedSession());
    renderApp();
    await waitFor(() => expect(loadSupabaseMock).toHaveBeenCalled());
    await waitFor(() => expect(status()).toBe("guest"));
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("landing from a verification link loads the session", async () => {
    window.history.replaceState(null, "", "/#access_token=abc&refresh_token=def&type=signup");
    fakeAuth.presetSession(verifiedSession());
    renderApp();
    await waitFor(() => expect(status()).toBe("signed-in"));
  });

  it("renders as 'unknown' on the server, never assuming guest or signed in", () => {
    storeSessionHint();
    const seen: string[] = [];
    function Spy() {
      seen.push(useAuth().status);
      return null;
    }
    renderToString(
      <AuthProvider>
        <Spy />
      </AuthProvider>,
    );
    expect(seen).toEqual(["unknown"]);
    expect(loadSupabaseMock).not.toHaveBeenCalled();
  });

  it("falls back to guest if Supabase can't be loaded", async () => {
    storeSessionHint();
    loadSupabaseMock.mockRejectedValueOnce(new Error("offline"));
    renderApp();
    await waitFor(() => expect(status()).toBe("guest"));
  });
});

describe("auth helpers", () => {
  it("toVerifiedUser: only a confirmed email counts", () => {
    expect(toVerifiedUser(null)).toBeNull();
    expect(toVerifiedUser(unverifiedSession())).toBeNull();
    expect(toVerifiedUser(verifiedSession("a@b.co", "id-1"))).toEqual({
      id: "id-1",
      email: "a@b.co",
    });
    expect(
      toVerifiedUser({
        user: { id: "id-2", email: "g@b.co", confirmed_at: "2026-01-01T00:00:00Z" },
      }),
    ).toEqual({ id: "id-2", email: "g@b.co" });
  });

  it("hasSessionHint: stored session, auth link params, or an editor preview frame", () => {
    expect(hasSessionHint()).toBe(false);
    window.localStorage.setItem("unrelated", "1");
    expect(hasSessionHint()).toBe(false);
    storeSessionHint();
    expect(hasSessionHint()).toBe(true);
    window.localStorage.clear();
    window.history.replaceState(null, "", "/stats#error=access_denied&error_description=nope");
    expect(hasSessionHint()).toBe(true);
    window.history.replaceState(null, "", "/");
    const framed = {
      ...window,
      localStorage: window.localStorage,
      location: window.location,
      self: 1,
      top: 2,
    };
    expect(hasSessionHint(framed as unknown as Window)).toBe(true);
  });

  it("readAuthErrorFromUrl: reads the error from the hash or the query", () => {
    expect(readAuthErrorFromUrl({ hash: "", search: "" })).toBeNull();
    expect(
      readAuthErrorFromUrl({
        hash: "#error=server_error&error_description=Unsupported+provider",
        search: "",
      }),
    ).toBe("Unsupported provider");
    expect(readAuthErrorFromUrl({ hash: "", search: "?error=access_denied" })).toBe(
      "access_denied",
    );
  });
});

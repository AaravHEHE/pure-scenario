import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

vi.mock(
  "@/lib/supabase",
  async () => (await import("./helpers/fake-supabase-auth")).supabaseModuleMock,
);

import { isGoogleSignInEnabled } from "@/lib/auth";
import { renderApp } from "@/test/helpers/auth-harness";
import { fakeAuth, resetFakeAuth } from "@/test/helpers/fake-supabase-auth";

const SUPABASE_URL = "https://testproject.supabase.co";

function stubAuthSettings(response: () => Promise<Response>) {
  const fetchMock = vi.fn(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const settings = (external: Record<string, boolean>) => async () =>
  new Response(JSON.stringify({ external }), { status: 200 });

beforeEach(() => {
  resetFakeAuth();
  vi.stubEnv("VITE_SUPABASE_URL", SUPABASE_URL);
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function clickGoogle() {
  fireEvent.click(await screen.findByRole("button", { name: "Sign in" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Continue with Google" }));
  return dialog;
}

describe("Google sign-in when it isn't configured", () => {
  it("shows a clear error instead of redirecting when the provider is off", async () => {
    const fetchMock = stubAuthSettings(settings({ google: false, email: true }));
    renderApp();
    const dialog = await clickGoogle();

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Google sign-in isn't set up yet. Use your email and password for now.",
    );
    expect(fetchMock).toHaveBeenCalledWith(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: "sb_publishable_test" },
    });
    expect(fakeAuth.auth.signInWithOAuth).not.toHaveBeenCalled();
    // Still usable: the button is back and email sign-in is right there.
    expect(within(dialog).getByRole("button", { name: "Continue with Google" })).toBeEnabled();
    expect(within(dialog).getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByTestId("status")).toHaveTextContent("guest");
  });

  it("shows a connection error if the auth service can't be reached", async () => {
    stubAuthSettings(() => Promise.reject(new TypeError("Failed to fetch")));
    renderApp();
    const dialog = await clickGoogle();
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      /Couldn't reach the sign-in service/,
    );
    expect(fakeAuth.auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("treats an error response from the settings check as not configured", async () => {
    stubAuthSettings(async () => new Response("nope", { status: 500 }));
    renderApp();
    const dialog = await clickGoogle();
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/isn't set up yet/);
  });

  it("is not configured when the Supabase env vars are missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    const fetchMock = stubAuthSettings(settings({ google: true }));
    await expect(isGoogleSignInEnabled()).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows Supabase's error if starting the redirect fails", async () => {
    stubAuthSettings(settings({ google: true }));
    fakeAuth.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { provider: "google", url: "" },
      error: { message: "Unsupported provider: provider is not enabled" },
    });
    renderApp();
    const dialog = await clickGoogle();
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/provider is not enabled/);
  });

  it("opens the dialog with the error when Google sends the player back with one", async () => {
    window.history.replaceState(
      null,
      "",
      "/#error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code",
    );
    renderApp();
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Unable to exchange external code");
    expect(window.location.hash).toBe("");
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("Google sign-in when it is configured", () => {
  it("redirects to Google, returning to the page the player was on", async () => {
    stubAuthSettings(settings({ google: true }));
    renderApp();
    const dialog = await clickGoogle();
    await waitFor(() =>
      expect(fakeAuth.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` },
      }),
    );
    expect(within(dialog).getByRole("button", { name: "Opening Google…" })).toBeDisabled();
  });
});

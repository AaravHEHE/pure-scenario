import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

vi.mock(
  "@/lib/supabase",
  async () => (await import("./helpers/fake-supabase-auth")).supabaseModuleMock,
);

import { renderApp } from "@/test/helpers/auth-harness";
import {
  fakeAuth,
  resetFakeAuth,
  unverifiedSession,
  verifiedSession,
} from "@/test/helpers/fake-supabase-auth";

beforeEach(() => {
  resetFakeAuth();
});

const status = () => screen.getByTestId("status").textContent;
const balance = () => screen.getByTestId("balance").textContent;

async function openDialog() {
  fireEvent.click(await screen.findByRole("button", { name: "Sign in" }));
  return screen.findByRole("dialog");
}

function fill(dialog: HTMLElement, email: string, password: string) {
  fireEvent.change(within(dialog).getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(within(dialog).getByLabelText("Password"), { target: { value: password } });
}

describe("email/password: sign up -> verification required -> sign in", () => {
  it("walks the whole flow, treating the account as signed out until it's verified", async () => {
    renderApp();
    await waitFor(() => expect(status()).toBe("guest"));

    // 1. Sign up. Supabase sends the verification email and returns no session.
    let dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Create one" }));
    expect(within(dialog).getByRole("heading", { name: "Create account" })).toBeInTheDocument();
    fill(dialog, "ada@example.com", "correct horse");
    fireEvent.click(within(dialog).getByRole("button", { name: "Create account" }));

    expect(
      await within(dialog).findByRole("heading", { name: "Check your email" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("status")).toHaveTextContent("ada@example.com");
    expect(fakeAuth.auth.signUp).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "correct horse",
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    expect(status()).toBe("guest");

    // 2. Try to sign in before verifying: refused, still a guest.
    fakeAuth.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { code: "email_not_confirmed", message: "Email not confirmed" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Back to sign in" }));
    fill(dialog, "ada@example.com", "correct horse");
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign in" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/Verify your email first/);
    expect(status()).toBe("guest");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();

    // 3. After clicking the verification link, signing in works.
    fakeAuth.auth.signInWithPassword.mockImplementationOnce(async () => {
      fakeAuth.setSession(verifiedSession("ada@example.com"));
      return { data: { user: null, session: verifiedSession("ada@example.com") }, error: null };
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(status()).toBe("signed-in"));
    expect(screen.getByTestId("user")).toHaveTextContent("ada@example.com");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByText("ada@example.com", { selector: "header span" })).toBeInTheDocument();

    // 4. Sign out: back to a guest.
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(status()).toBe("guest"));
    dialog = await openDialog();
    expect(dialog).toBeInTheDocument();
  });

  it("an unverified session (a project that doesn't block sign-in) is still treated as signed out", async () => {
    fakeAuth.auth.signInWithPassword.mockImplementationOnce(async () => {
      fakeAuth.setSession(unverifiedSession());
      return { data: { user: null, session: unverifiedSession() }, error: null };
    });
    renderApp();
    const dialog = await openDialog();
    fill(dialog, "ada@example.com", "correct horse");
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign in" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/Verify your email first/);
    expect(status()).toBe("guest");
    expect(fakeAuth.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("a sign-up that comes back with an unverified session doesn't keep it", async () => {
    fakeAuth.auth.signUp.mockResolvedValueOnce({
      data: { user: unverifiedSession().user, session: unverifiedSession() } as never,
      error: null,
    });
    renderApp();
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Create one" }));
    fill(dialog, "ada@example.com", "correct horse");
    fireEvent.click(within(dialog).getByRole("button", { name: "Create account" }));

    expect(
      await within(dialog).findByRole("heading", { name: "Check your email" }),
    ).toBeInTheDocument();
    expect(fakeAuth.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(status()).toBe("guest");
  });

  it("shows Supabase's errors in plain language, without crashing", async () => {
    renderApp();
    const dialog = await openDialog();
    fill(dialog, "ada@example.com", "wrong password");
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign in" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "That email and password don't match an account.",
    );
    expect(status()).toBe("guest");
  });
});

describe("game state follows whoever is playing", () => {
  it("starts from zero on sign-in and again on sign-out (no transfer yet)", async () => {
    renderApp();
    await waitFor(() => expect(status()).toBe("guest"));
    fireEvent.click(screen.getByRole("button", { name: "Win a flip" }));
    fireEvent.click(screen.getByRole("button", { name: "Win a flip" }));
    expect(balance()).toBe("2");

    fakeAuth.auth.signInWithPassword.mockImplementationOnce(async () => {
      fakeAuth.setSession(verifiedSession());
      return { data: { user: null, session: verifiedSession() }, error: null };
    });
    const dialog = await openDialog();
    fill(dialog, "ada@example.com", "correct horse");
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(status()).toBe("signed-in"));
    expect(balance()).toBe("0");

    fireEvent.click(screen.getByRole("button", { name: "Win a flip" }));
    expect(balance()).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(status()).toBe("guest"));
    expect(balance()).toBe("0");
  });
});

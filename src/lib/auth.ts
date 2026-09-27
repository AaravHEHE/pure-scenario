// Pure helpers for the signed-in / guest boundary. No Supabase import here:
// the client (and supabase-js) is loaded lazily, see src/lib/supabase.ts.

export interface AuthUser {
  id: string;
  email: string | null;
}

/** The subset of a Supabase session this app reads. */
export interface SessionLike {
  user: {
    id: string;
    email?: string | null;
    email_confirmed_at?: string | null;
    confirmed_at?: string | null;
  };
}

/**
 * The signed-in user, or null. An account whose email isn't verified is
 * treated as signed out, whatever the Supabase project's settings allow.
 */
export function toVerifiedUser(session: SessionLike | null | undefined): AuthUser | null {
  const user = session?.user;
  if (!user) return null;
  if (!user.email_confirmed_at && !user.confirmed_at) return null;
  return { id: user.id, email: user.email ?? null };
}

// supabase-js stores the session under sb-<project-ref>-auth-token.
const STORED_SESSION_KEY = /^sb-.+-auth-token$/;
const AUTH_URL_PARAMS = ["access_token", "refresh_token", "error_description", "error_code"];

function authParams(location: Pick<Location, "hash" | "search">): URLSearchParams[] {
  return [
    new URLSearchParams(location.hash.replace(/^#/, "")),
    new URLSearchParams(location.search),
  ];
}

/**
 * Whether there's any sign of a session worth loading Supabase at startup
 * for: a saved login, a sign-in or verification link landing, or running
 * inside Lovable's editor preview (which brokers the session through the
 * editor, so it may not be in this frame's storage). Without one, a guest
 * never downloads supabase-js until they open Sign in.
 */
export function hasSessionHint(win: Window = window): boolean {
  try {
    for (let i = 0; i < win.localStorage.length; i++) {
      if (STORED_SESSION_KEY.test(win.localStorage.key(i) ?? "")) return true;
    }
  } catch {
    // Storage blocked: fall through to the other signs.
  }
  if (authParams(win.location).some((p) => AUTH_URL_PARAMS.some((name) => p.has(name)))) {
    return true;
  }
  return win.self !== win.top;
}

/** The error a failed sign-in or verification redirect came back with, if any. */
export function readAuthErrorFromUrl(location: Pick<Location, "hash" | "search">): string | null {
  for (const params of authParams(location)) {
    const description = params.get("error_description");
    if (description) return description.replace(/\+/g, " ");
    if (params.get("error")) return params.get("error");
  }
  return null;
}

/** Removes auth error params from the address bar so a refresh doesn't re-show them. */
export function clearAuthErrorFromUrl(win: Window = window) {
  const url = new URL(win.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  for (const name of ["error", "error_code", "error_description"]) {
    url.searchParams.delete(name);
    hash.delete(name);
  }
  url.hash = hash.toString();
  win.history.replaceState(win.history.state, "", url.toString());
}

/** Plain-language messages for the Supabase auth errors a player can hit. */
export function authErrorMessage(
  error: { code?: string | undefined; message?: string | undefined } | null | undefined,
): string {
  switch (error?.code) {
    case "email_not_confirmed":
      return "Verify your email first — open the link we sent you, then sign in.";
    case "invalid_credentials":
      return "That email and password don't match an account.";
    case "user_already_exists":
    case "email_exists":
      return "An account with that email already exists. Sign in instead.";
    case "weak_password":
      return error.message ?? "Choose a stronger password.";
    case "over_email_send_rate_limit":
      return "Too many emails sent. Wait a minute and try again.";
    default:
      return error?.message || "Something went wrong. Try again.";
  }
}

/**
 * Whether Google sign-in is enabled for the Supabase project, from its public
 * auth settings. Checked before redirecting, so an unconfigured provider shows
 * an error here instead of sending the player to a raw error page.
 */
export async function isGoogleSignInEnabled(): Promise<boolean> {
  const url = import.meta.env["VITE_SUPABASE_URL"];
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return false;
  const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
  if (!response.ok) return false;
  const settings = (await response.json()) as { external?: { google?: boolean } };
  return settings.external?.google === true;
}

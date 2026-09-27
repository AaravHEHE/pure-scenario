import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  authErrorMessage,
  clearAuthErrorFromUrl,
  hasSessionHint,
  isGoogleSignInEnabled,
  readAuthErrorFromUrl,
  toVerifiedUser,
  type AuthUser,
  type SessionLike,
} from "@/lib/auth";
import { loadSupabase } from "@/lib/supabase";

/**
 * "unknown" until the browser has checked for a session (and always on the
 * server). An unverified account counts as "guest".
 */
export type AuthStatus = "unknown" | "guest" | "signed-in";

export type AuthResult = { ok: true; needsVerification?: boolean } | { ok: false; error: string };

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** Error a sign-in or verification redirect came back with, until dismissed. */
  redirectError: string | null;
  dismissRedirectError: () => void;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type SupabaseModule = Awaited<ReturnType<typeof loadSupabase>>;

const fail = (error: string): AuthResult => ({ ok: false, error });

// Where verification links and Google send the player back to: the page they
// were on, without any leftover auth params.
const returnUrl = () => `${window.location.origin}${window.location.pathname}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("unknown");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const connection = useRef<Promise<SupabaseModule> | null>(null);

  const applySession = useCallback((session: SessionLike | null) => {
    const verified = toVerifiedUser(session);
    setUser(verified);
    setStatus(verified ? "signed-in" : "guest");
  }, []);

  // Loads Supabase once and follows its session from then on. Resolves to the
  // module, not the client, so the client is never treated as a thenable.
  const connect = useCallback(() => {
    connection.current ??= loadSupabase().then((module) => {
      module.supabase.auth.onAuthStateChange((_event, session) => applySession(session));
      return module;
    });
    return connection.current;
  }, [applySession]);

  useEffect(() => {
    const hint = hasSessionHint();
    const error = readAuthErrorFromUrl(window.location);
    if (error) {
      setRedirectError(error);
      clearAuthErrorFromUrl();
    }
    if (hint) {
      connect().catch(() => setStatus("guest"));
    } else {
      setStatus("guest");
    }
  }, [connect]);

  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const { supabase } = await connect();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: returnUrl() },
        });
        if (error) return fail(authErrorMessage(error));
        // Only if the project auto-confirms emails; otherwise Supabase sends
        // the verification email and returns no session.
        if (toVerifiedUser(data.session)) return { ok: true };
        // Never keep an unverified session around.
        if (data.session) await supabase.auth.signOut({ scope: "local" });
        return { ok: true, needsVerification: true };
      } catch (error) {
        return fail(authErrorMessage(error as { message?: string }));
      }
    },
    [connect],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const { supabase } = await connect();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return fail(authErrorMessage(error));
        if (!toVerifiedUser(data.session)) {
          await supabase.auth.signOut({ scope: "local" });
          return fail(authErrorMessage({ code: "email_not_confirmed" }));
        }
        return { ok: true };
      } catch (error) {
        return fail(authErrorMessage(error as { message?: string }));
      }
    },
    [connect],
  );

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    let enabled: boolean;
    try {
      enabled = await isGoogleSignInEnabled();
    } catch {
      return fail("Couldn't reach the sign-in service. Check your connection and try again.");
    }
    if (!enabled)
      return fail("Google sign-in isn't set up yet. Use your email and password for now.");
    try {
      const { supabase } = await connect();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: returnUrl() },
      });
      if (error) return fail(authErrorMessage(error));
      return { ok: true }; // The browser is on its way to Google.
    } catch (error) {
      return fail(authErrorMessage(error as { message?: string }));
    }
  }, [connect]);

  const signOut = useCallback(async () => {
    const { supabase } = await connect();
    const { error } = await supabase.auth.signOut();
    // If the server call fails, still end the session in this browser.
    if (error) await supabase.auth.signOut({ scope: "local" });
  }, [connect]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      redirectError,
      dismissRedirectError: () => setRedirectError(null),
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
    }),
    [status, user, redirectError, signUp, signIn, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

/** For state that also works without auth (the game data layer in tests). */
export function useOptionalAuth(): AuthContextValue | undefined {
  return useContext(AuthContext);
}

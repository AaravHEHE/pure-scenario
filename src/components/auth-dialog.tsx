import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useId, useState, type FormEvent } from "react";

import { useAuth } from "@/hooks/use-auth";

type Mode = "sign-in" | "sign-up";

const primaryButton =
  "w-full border-2 border-ink bg-ink px-4 py-3 font-sans text-sm uppercase tracking-widest text-on-dark disabled:cursor-wait";
const secondaryButton =
  "w-full border-2 border-ink px-4 py-3 font-sans text-sm uppercase tracking-widest text-ink disabled:cursor-wait";
const fieldLabel = "font-sans text-xs uppercase tracking-widest";
// 16px text so phones don't zoom into the field.
const fieldInput = "w-full border-2 border-ink bg-base px-3 py-2 font-sans text-base text-ink";

export function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationSentTo, setVerificationSentTo] = useState<string | null>(null);
  const emailId = useId();
  const passwordId = useId();

  const shownError = error ?? auth.redirectError;

  useEffect(() => {
    if (open && auth.status === "signed-in") onOpenChange(false);
  }, [open, auth.status, onOpenChange]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setMode("sign-in");
      setPassword("");
      setPending(null);
      setError(null);
      setVerificationSentTo(null);
      auth.dismissRedirectError();
    }
    onOpenChange(next);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setVerificationSentTo(null);
    auth.dismissRedirectError();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    auth.dismissRedirectError();
    setPending("email");
    const result =
      mode === "sign-in" ? await auth.signIn(email, password) : await auth.signUp(email, password);
    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.needsVerification) {
      setVerificationSentTo(email);
      setPassword("");
      return;
    }
    handleOpenChange(false);
  }

  async function handleGoogle() {
    setError(null);
    auth.dismissRedirectError();
    setPending("google");
    const result = await auth.signInWithGoogle();
    // On success the browser is leaving for Google, so stay pending.
    if (!result.ok) {
      setPending(null);
      setError(result.error);
    }
  }

  const title = mode === "sign-in" ? "Sign in" : "Create account";

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-ink/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto border-2 border-ink bg-base p-6 text-ink">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-4xl leading-none">
              {verificationSentTo ? "Check your email" : title}
            </Dialog.Title>
            <Dialog.Close aria-label="Close" className="p-1 text-ink">
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <g stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="3" x2="15" y2="15" />
                  <line x1="15" y1="3" x2="3" y2="15" />
                </g>
              </svg>
            </Dialog.Close>
          </div>

          {verificationSentTo ? (
            <div className="mt-4 flex flex-col gap-6">
              <Dialog.Description role="status" className="font-sans text-sm">
                We sent a verification link to{" "}
                <strong className="font-normal underline">{verificationSentTo}</strong>. Open it to
                verify your account. Until then, you&apos;re still playing as a guest.
              </Dialog.Description>
              <button
                type="button"
                className={secondaryButton}
                onClick={() => switchMode("sign-in")}
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-5">
              <Dialog.Description className="font-sans text-sm">
                {mode === "sign-in"
                  ? "Use Google, or the email and password you signed up with."
                  : "Use Google, or an email and password. We'll email you a link to verify your account."}
              </Dialog.Description>

              <button
                type="button"
                className={secondaryButton}
                disabled={pending !== null}
                onClick={() => void handleGoogle()}
              >
                {pending === "google" ? "Opening Google…" : "Continue with Google"}
              </button>

              <p className="text-center font-sans text-xs uppercase tracking-widest">or</p>

              <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
                <div className="flex flex-col gap-1">
                  <label htmlFor={emailId} className={fieldLabel}>
                    Email
                  </label>
                  <input
                    id={emailId}
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={fieldInput}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={passwordId} className={fieldLabel}>
                    Password
                  </label>
                  <input
                    id={passwordId}
                    type="password"
                    autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={fieldInput}
                  />
                </div>
                <button type="submit" className={primaryButton} disabled={pending !== null}>
                  {pending === "email"
                    ? mode === "sign-in"
                      ? "Signing in…"
                      : "Creating account…"
                    : title}
                </button>
              </form>

              {shownError ? (
                <p role="alert" className="border-2 border-tomato px-3 py-2 font-sans text-sm">
                  {shownError}
                </p>
              ) : null}

              <p className="text-center font-sans text-sm">
                {mode === "sign-in" ? "No account yet? " : "Already have an account? "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => switchMode(mode === "sign-in" ? "sign-up" : "sign-in")}
                >
                  {mode === "sign-in" ? "Create one" : "Sign in"}
                </button>
              </p>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

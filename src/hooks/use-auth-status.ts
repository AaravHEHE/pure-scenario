import { useAuth } from "@/hooks/use-auth";

/** A verified account is signed in. */
export function useIsSignedIn(): boolean {
  return useAuth().status === "signed-in";
}

/** Known to be a guest: false while the browser is still checking for a session. */
export function useIsGuest(): boolean {
  return useAuth().status === "guest";
}

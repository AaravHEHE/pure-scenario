const STORAGE_KEY = "pr_guest_id";

/** Returns this browser's guest UUID, creating and persisting one if needed. */
export function getGuestId(): string {
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
}

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { audioManager } from "@/lib/audio-manager";

const STORAGE_KEY = "pr_sound_enabled";

interface SoundSettings {
  enabled: boolean;
  toggle: () => void;
}

const SoundSettingsContext = createContext<SoundSettings | undefined>(undefined);

export function SoundSettingsProvider({ children }: { children: ReactNode }) {
  // Muted by default — never autoplay on load.
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setEnabled(stored === "true");
  }, []);

  useEffect(() => {
    audioManager.setMuted(!enabled);
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  }, [enabled]);

  return (
    <SoundSettingsContext.Provider value={{ enabled, toggle: () => setEnabled((v) => !v) }}>
      {children}
    </SoundSettingsContext.Provider>
  );
}

export function useSoundSettings(): SoundSettings {
  const ctx = useContext(SoundSettingsContext);
  if (!ctx) throw new Error("useSoundSettings must be used within SoundSettingsProvider");
  return ctx;
}

export type SoundName = "click" | "win" | "lose";

// Real files land later in /public/sounds/ — until then, playback is a
// silent no-op (missing file, autoplay block, etc. are all swallowed).
const SOUND_SRC: Record<SoundName, string> = {
  click: "/sounds/click.mp3",
  win: "/sounds/win.mp3",
  lose: "/sounds/lose.mp3",
};

class AudioManager {
  private muted = true;

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  play(sound: SoundName) {
    if (this.muted || typeof Audio === "undefined") return;
    try {
      const audio = new Audio(SOUND_SRC[sound]);
      void audio.play().catch(() => {
        // Stub file may 404, or autoplay may be blocked — both are fine to ignore.
      });
    } catch {
      // Ignore — stub audio manager, real files land later.
    }
  }
}

export const audioManager = new AudioManager();

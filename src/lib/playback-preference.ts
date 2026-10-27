const STORAGE_KEY = "nabeen-video-playback-v1";
const CHANGE_EVENT = "nabeen-video-playback-change";
export type PlaybackPreference = "auto" | "playing" | "paused" | "pending";

export function readPlaybackPreference(): PlaybackPreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "playing" || value === "paused" ? value : "auto";
  } catch {
    return "auto";
  }
}

export function serverPlaybackPreference(): PlaybackPreference {
  return "pending";
}

export function subscribePlaybackPreference(callback: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) callback();
  };
  window.addEventListener("storage", storage);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

export function savePlaybackPreference(playing: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, playing ? "playing" : "paused");
  } catch {
    /* The component still honors the choice when storage is unavailable. */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

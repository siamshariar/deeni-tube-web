// lib/feed-playback.ts
// The "Playback in feeds" setting (Settings page): whether video cards play their video in the card, on hover
// with a mouse and as they scroll into view on phones and tablets (YouTube's inline playback). On by default.
import { createLocalStore, useLocalStore } from "@/lib/local-store";

const store = createLocalStore<boolean>("deeni-feed-playback", () => true);

/** The saved value (read it in effects and event handlers: it's only known in the browser). */
export function feedPlaybackOn(): boolean {
  return store.get() !== false;
}

export function subscribeFeedPlayback(listener: () => void): () => void {
  return store.subscribe(listener);
}

export function setFeedPlayback(on: boolean) {
  store.set(() => on);
}

/** For the Settings page: the saved value, or On before hydration (the default). */
export function useFeedPlaybackSetting(): boolean {
  return useLocalStore(store, true) !== false;
}

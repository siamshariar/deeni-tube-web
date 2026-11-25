// lib/ambient.ts
// Ambient mode on the watch pages, as on YouTube: the video's colours glow around the player (components/ambient-light.tsx
// draws it). On unless switched off in the player's settings, kept per device ('deeni-ambient'). With a mouse only, in the
// dark theme, and in theater mode in both.
import { createLocalStore, useLocalStore } from "@/lib/local-store";

const store = createLocalStore<boolean>("deeni-ambient", () => true);
export const useAmbient = () => useLocalStore(store, true) !== false;
export const setAmbient = (on: boolean) => store.set(() => on);

/** Where the player on the page is */
export type AmbientTime = { videoId: string; time: number; duration: number };
let at: AmbientTime | null = null;
const listeners = new Set<(at: AmbientTime) => void>();
export function setAmbientTime(next: AmbientTime) {
  at = next;
  listeners.forEach((l) => l(next));
}
export function onAmbientTime(listener: (at: AmbientTime) => void) {
  listeners.add(listener);
  if (at) listener(at);
  return () => void listeners.delete(listener);
}

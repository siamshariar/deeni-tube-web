// lib/sleep-timer.ts
// The player's sleep timer, as on YouTube: it stops the video after some minutes or at its end. It goes on over the next
// videos, until the page is closed or reloaded. It runs here, not in the player: when its time comes on a page without
// one, it is simply over, and doesn't stop the next video that is opened.
import { useSyncExternalStore } from "react";

/** When to stop (ms since 1970), or at the end of the video */
export type Sleep = number | "end" | null;
export const SLEEP_MINUTES = [10, 15, 20, 30, 45, 60];

let sleep: Sleep = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const stops = new Set<() => void>();
export const getSleep = () => sleep;
export function setSleep(next: Sleep) {
  clearTimeout(timer);
  sleep = next;
  if (typeof next === "number")
    timer = setTimeout(() => {
      setSleep(null);
      stops.forEach((stop) => stop());
    }, next - Date.now());
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const useSleep = () => useSyncExternalStore(subscribe, getSleep, () => null);
/** What the player does when the time comes */
export function onSleep(stop: () => void) {
  stops.add(stop);
  return () => void stops.delete(stop);
}

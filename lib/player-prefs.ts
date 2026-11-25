// lib/player-prefs.ts
// What the visitor set in the players, for the next videos and shorts, as on YouTube: the volume and mute on this device
// ('deeni-volume', watch pages and Shorts), the watch player's speed until the tab is closed ('deeni-speed').
import { createLocalStore } from "@/lib/local-store";

type Sound = { volume: number; muted: boolean };
const DEFAULT: Sound = { volume: 100, muted: false };
const store = createLocalStore<Sound>("deeni-volume", () => DEFAULT);

/** Only where there's a mouse: the watch player has no volume button on touch screens (phones have keys) */
export function savedSound(): Sound {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches ? { ...DEFAULT, ...store.get() } : DEFAULT;
}
export const saveSound = (next: Partial<Sound>) => store.set((s) => ({ ...s, ...next }));

let speed: number | null = null;
export function savedSpeed(): number {
  if (speed === null) {
    try {
      speed = Number(sessionStorage.getItem("deeni-speed")) || 1;
    } catch {
      speed = 1;
    }
  }
  return speed;
}
export function saveSpeed(rate: number) {
  speed = rate;
  try {
    sessionStorage.setItem("deeni-speed", String(rate));
  } catch {}
}

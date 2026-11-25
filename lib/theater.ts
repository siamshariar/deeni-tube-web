// lib/theater.ts
// Theater mode on the watch pages, as on YouTube: the player over the whole width under the header, everything else under
// it. Kept per device ('deeni-theater'). The layout is CSS only ("Theater mode" in app/globals.css, html[data-theater]; a script
// in app/layout.tsx sets that before first paint), so the player itself isn't touched and goes on playing.
import { createLocalStore, useLocalStore } from "@/lib/local-store";

/** Where theater mode (and Ambient mode) is: with a mouse, from 768px */
export const THEATER_SCREENS = "(min-width: 768px) and (hover: hover) and (pointer: fine)";

const store = createLocalStore<boolean>("deeni-theater", () => false);
export const useTheater = () => useLocalStore(store, false) === true;

const apply = (on: boolean) => {
  if (on) document.documentElement.dataset.theater = "";
  else delete document.documentElement.dataset.theater;
};
// Changed in another tab: this one's layout follows, as its button does
if (typeof window !== "undefined") window.addEventListener("storage", (e) => { if (e.key === "deeni-theater" || e.key === null) apply(store.get() === true); });

export function toggleTheater() {
  const html = document.documentElement;
  const on = store.get() !== true;
  const change = () => {
    apply(on);
    store.set(() => on);
  };
  // The player grows or shrinks to its new place where the browser can do that
  if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return change();
  html.dataset.theaterMoving = "";
  document.startViewTransition(change).finished.finally(() => { delete html.dataset.theaterMoving; });
}

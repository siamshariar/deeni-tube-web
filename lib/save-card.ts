// lib/save-card.ts
// The "Save to..." card (components/save-card.tsx), opened from anywhere: as on YouTube it opens right at the button
// that was pressed (a bottom sheet on phones). One card for the whole app, in app/layout.tsx.
import { useSyncExternalStore } from "react";

export interface SaveCardVideo {
  /** Internal or YouTube id */
  id: string;
  title: string;
  channel: string;
}
interface SaveCardState {
  open: boolean;
  video: SaveCardVideo;
  /** Where it opens: the pressed button, or where it was if it's gone */
  anchor: { getBoundingClientRect: () => DOMRect };
  /** Goes up each time it opens, so the card starts afresh */
  opened: number;
}

let state: SaveCardState | null = null;
const listeners = new Set<() => void>();
const set = (next: SaveCardState | null) => {
  state = next;
  listeners.forEach((l) => l());
};

// The last button, link or menu item pressed: where the card opens when the focus can't tell (Safari doesn't focus a
// clicked button)
let lastPress: { el: Element; rect: DOMRect } | null = null;
/** Follow presses (once, by the card's host). */
export function trackPresses() {
  const onPress = (e: PointerEvent) => {
    const el = e.target instanceof Element ? e.target.closest("button, a, [role='button'], [role='menuitem']") : null;
    if (el) lastPress = { el, rect: el.getBoundingClientRect() };
  };
  window.addEventListener("pointerdown", onPress, true);
  return () => window.removeEventListener("pointerdown", onPress, true);
}

function anchorAt(el?: Element | null) {
  // A menu that opened it has given the focus back to its own button
  const focused = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
  const target = el ?? focused ?? lastPress?.el ?? null;
  let rect = target?.isConnected ? target.getBoundingClientRect() : lastPress?.rect ?? new DOMRect(window.innerWidth / 2, window.innerHeight / 3, 0, 0);
  return {
    getBoundingClientRect: () => {
      const now = target?.isConnected ? target.getBoundingClientRect() : null;
      if (now && now.width > 0) rect = now;
      return rect;
    },
  };
}

/** Open the card for a video, at `el` (or the button that was just used). */
export function openSaveCard(video: SaveCardVideo, el?: Element | null) {
  set({ open: true, video, anchor: anchorAt(el), opened: (state?.opened ?? 0) + 1 });
}
export function closeSaveCard() {
  if (state?.open) set({ ...state, open: false });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export const useSaveCard = () => useSyncExternalStore(subscribe, () => state, () => null);

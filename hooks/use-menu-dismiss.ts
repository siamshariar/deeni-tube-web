// hooks/use-menu-dismiss.ts
// How every menu closes: the page (and any list in it) scrolls while a menu is open, and scrolling closes it; a click
// outside only closes it, without also opening the video under the pointer. Used by components/ui/dropdown-menu.tsx
// and the Shorts page's own ⋮ menu.
"use client";

import { useEffect, useRef } from "react";

// Scrolled this far (px), a menu closes: less is a touch or trackpad that isn't quite still
const SCROLL_CLOSE_PX = 8;
// How long after a press outside its click can come (touch screens send it late)
const CLICK_WAIT_MS = 400;

export function useMenuDismiss(
  open: boolean,
  {
    isInMenu,
    isTrigger,
    onDismiss,
  }: {
    isInMenu: (target: EventTarget | null) => boolean;
    /** The button that opens a menu: pressing it isn't "outside" (it closes or switches menus itself) */
    isTrigger: (target: EventTarget | null) => boolean;
    onDismiss: (by: "scroll" | "click") => void;
  }
) {
  const latest = useRef({ isInMenu, isTrigger, onDismiss });
  useEffect(() => {
    latest.current = { isInMenu, isTrigger, onDismiss };
  });

  useEffect(() => {
    if (!open) return;
    // Any scrolling but the menu's own; each scroller is measured from where it was first seen
    const from = new Map<EventTarget, number>([[document, window.scrollY]]);
    const onScroll = (e: Event) => {
      const t = e.target;
      if (!t || latest.current.isInMenu(t)) return;
      const top = t === document ? window.scrollY : (t as Element).scrollTop;
      const start = from.get(t);
      if (start === undefined) from.set(t, top);
      else if (Math.abs(top - start) > SCROLL_CLOSE_PX) latest.current.onDismiss("scroll");
    };
    // The click of a press outside only closes the menu. (It can close on the press itself, so this can't wait for
    // this effect's cleanup.)
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || latest.current.isInMenu(e.target) || latest.current.isTrigger(e.target)) return;
      // A message's Undo works while a menu is open
      if (e.target instanceof Element && e.target.closest("[data-sonner-toast]")) return;
      const onClick = (c: MouseEvent) => {
        c.preventDefault();
        c.stopPropagation();
        latest.current.onDismiss("click");
      };
      const stop = () => window.removeEventListener("click", onClick, true);
      window.addEventListener("click", onClick, { capture: true, once: true });
      window.addEventListener("pointercancel", stop, { capture: true, once: true }); // it was a scroll
      window.addEventListener("pointerup", () => setTimeout(stop, CLICK_WAIT_MS), { capture: true, once: true });
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);
}

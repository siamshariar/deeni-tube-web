// hooks/use-keyboard-inset.ts
// How much of the screen's bottom the phone's keyboard covers (px), while `active`. Chrome and Safari draw the keyboard
// over the page, so what is fixed to the bottom would be behind it.
"use client";

import { useEffect, useState } from "react";

/** Less than this is a browser toolbar, not a keyboard */
const MIN = 80;

export function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const view = window.visualViewport;
    if (!active || !view) return;
    const read = () => {
      // Zoomed in with two fingers, the visible part is smaller too
      const covered = view.scale > 1.01 ? 0 : Math.round(window.innerHeight - view.height - view.offsetTop);
      setInset(covered < MIN ? 0 : covered);
    };
    read();
    view.addEventListener("resize", read);
    view.addEventListener("scroll", read);
    return () => {
      view.removeEventListener("resize", read);
      view.removeEventListener("scroll", read);
      setInset(0);
    };
  }, [active]);
  return inset;
}

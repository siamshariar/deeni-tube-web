// hooks/use-after-first-paint.ts
// False for a page's first frame when it is opened in the app, then true: for what can come a moment after the part the
// visitor opened it for (the end of a long list). True from the start on a page from the server, whose HTML has it all.
"use client";

import { startTransition, useEffect, useState } from "react";
import { useHydrated } from "@/lib/local-store";

export function useAfterFirstPaint(): boolean {
  const hydrated = useHydrated();
  const [ready, setReady] = useState(!hydrated);
  useEffect(() => {
    if (ready) return;
    // The second frame: the first one has been drawn by then
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => startTransition(() => setReady(true)));
    });
    return () => cancelAnimationFrame(frame);
  }, [ready]);
  return ready;
}

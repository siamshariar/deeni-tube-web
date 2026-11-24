// hooks/use-sidebar-collapsed.ts
// Whether the desktop sidebar is the mini one (components/desktop-sidebar says so on `window`). False until it's there.
"use client";

import { useSyncExternalStore } from "react";

const subscribe = (tell: () => void) => {
  window.addEventListener("sidebar-state-change", tell);
  return () => window.removeEventListener("sidebar-state-change", tell);
};

export function useSidebarCollapsed(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.__sidebarGetState?.() ?? false,
    () => false
  );
}

"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { bootPlayerHost } from "@/lib/player-host";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [desktopSidebarWidth, setDesktopSidebarWidth] = useState(240);

  // iPhone, iPad and Safari: the shared player that lets a tap on a video start it with sound
  useEffect(() => bootPlayerHost(), []);

  useEffect(() => {
    const syncSidebarWidth = () => {
      if (typeof window === "undefined") return;
      const isCollapsed =
        typeof window.__sidebarGetState === "function"
          ? window.__sidebarGetState()
          : false;
      setDesktopSidebarWidth(isCollapsed ? 72 : 240);
    };

    syncSidebarWidth();
    window.addEventListener("sidebar-state-change", syncSidebarWidth);
    window.addEventListener("resize", syncSidebarWidth);

    return () => {
      window.removeEventListener("sidebar-state-change", syncSidebarWidth);
      window.removeEventListener("resize", syncSidebarWidth);
    };
  }, []);

  // Video and playlist detail pages use overlay sidebar — content must not shift
  const hasDesktopSidebar = !(
    pathname?.startsWith("/videos/") ||
    pathname?.startsWith("/playlists/") ||
    pathname === "/signin"
  );

  // Shorts is a fixed, full-screen feed with its own offsets: no padding or minimum height here,
  // so the page behind it is never taller than the screen (and can't scroll or bounce on phones)
  const isShorts = pathname === "/shorts";

  return (
    <main
      data-has-sidebar={hasDesktopSidebar}
      className={
        isShorts
          ? "flex-1"
          : !hasDesktopSidebar
          ? // Video/playlist pages: room for the phone nav bar only on phones, so on desktop the page ends with its content
            "flex-1 md:pl-0 pb-[calc(56px+var(--sab-max))] md:pb-0 min-h-screen transition-none"
          : desktopSidebarWidth === 72
          ? "flex-1 md:pl-[72px] pb-[calc(56px+var(--sab-max))] min-h-screen transition-all duration-300 ease-in-out"
          : "flex-1 md:pl-[240px] pb-[calc(56px+var(--sab-max))] min-h-screen transition-all duration-300 ease-in-out"
      }
    >
      {children}
    </main>
  );
}
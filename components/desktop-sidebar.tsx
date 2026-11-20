// components/desktop-sidebar.tsx
"use client";

import { usePathname } from "next/navigation";
import {
  Home,
  PlaySquare,
  Users,
  GraduationCap,
  LayoutGrid,
  ListVideo,
  // Clock,    // Watch Later — hidden
  // ThumbsUp, // Liked Videos — hidden
} from "lucide-react";
import { cn, isActivePath } from "@/lib/utils";
import { useHeader } from "@/app/contexts/header-context";
import { useState, useEffect } from "react";
import {
  SidebarItem,
  SidebarExpandedContent,
  UserIcon,
} from "@/components/sidebar-expanded-content";

export default function DesktopSidebar() {
  const { headerVisible } = useHeader();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  // The page the overlay was opened on; navigating anywhere else closes it
  const [overlayOpenOn, setOverlayOpenOn] = useState<string | null>(null);
  const overlayOpen = overlayOpenOn !== null && overlayOpenOn === pathname;

  // Overlay mode: video detail pages and playlist detail pages.
  // The sidebar appears as a slide-in overlay — content never shifts.
  const isOverlayPage =
    !!pathname?.startsWith("/videos/") ||
    !!pathname?.startsWith("/playlists/");

  // Restore persisted collapsed state on mount
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after hydration (first paint is handled in globals.css)
    if (stored !== null) setIsCollapsed(stored === "true");
    // Enable transitions only after the restored state has painted (see globals.css)
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        document.documentElement.dataset.sidebarReady = "";
      });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Expose globals so AppHeader's hamburger can drive both modes
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.__sidebarToggle = () => {
      if (isOverlayPage) {
        setOverlayOpenOn((prev) => (prev === pathname ? null : pathname));
        return;
      }
      setIsCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem("sidebar-collapsed", String(next));
        return next;
      });
    };

    window.__sidebarGetState = () => isCollapsed;

    // Only notify AppShell when in normal (non-overlay) mode
    if (!isOverlayPage) {
      window.dispatchEvent(new Event("sidebar-state-change"));
    }

    return () => {
      delete window.__sidebarToggle;
      delete window.__sidebarGetState;
    };
  }, [isCollapsed, isOverlayPage, pathname]);

  if (pathname === "/signin") return null;

  const top    = headerVisible ? "top-[56px]" : "top-0";
  const height = headerVisible ? "h-[calc(100vh-56px)]" : "h-screen";

  // ── OVERLAY MODE (video & playlist detail pages) ──────────────────────────
  if (isOverlayPage) {
    return (
      <>
        {/* Backdrop — click to close */}
        <div
          className={cn(
            "hidden md:block fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
            headerVisible ? "top-[56px]" : "top-0",
            overlayOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          )}
          onClick={() => setOverlayOpenOn(null)}
        />

        {/* Slide-in sidebar panel */}
        <aside
          className={cn(
            "hidden md:flex fixed left-0 w-[240px] bg-background border-r z-50 overflow-y-auto overflow-x-hidden flex-col transition-transform duration-300 ease-in-out sidebar-scrollbar",
            top,
            height,
            overlayOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="w-full py-1.5">
            <SidebarExpandedContent pathname={pathname} />
          </div>
        </aside>
      </>
    );
  }

  // ── NORMAL MODE (all other pages) ─────────────────────────────────────────
  return (
    <aside
      className={cn(
        "desktop-sidebar hidden md:flex flex-col fixed left-0 bg-background overflow-y-auto overflow-x-hidden flex-shrink-0 z-30 transition-all duration-300 ease-in-out sidebar-scrollbar",
        isCollapsed ? "w-[72px]" : "w-[240px]",
        top,
        height
      )}
    >
      <div className="w-full py-3 flex flex-col flex-1">
        {isCollapsed ? (
          <>
            {/* Mini collapsed items — order: Home, Shorts, Channels, Scholars, You, Playlists, Categories */}
            <SidebarItem href="/" icon={<Home className="h-5 w-5 flex-shrink-0" />} label="Home" active={isActivePath(pathname, "/")} collapsed={true} />
            <SidebarItem href="/shorts" icon={<PlaySquare className="h-5 w-5 flex-shrink-0" />} label="Shorts" active={isActivePath(pathname, "/shorts")} collapsed={true} />
            <SidebarItem href="/channels" icon={<Users className="h-5 w-5 flex-shrink-0" />} label="Channels" active={isActivePath(pathname, "/channels")} collapsed={true} />
            <SidebarItem href="/scholars" icon={<GraduationCap className="h-5 w-5 flex-shrink-0" />} label="Scholars" active={isActivePath(pathname, "/scholars")} collapsed={true} />
            <SidebarItem href="/you" icon={<UserIcon className="h-5 w-5 flex-shrink-0" />} label="You" active={isActivePath(pathname, "/you")} collapsed={true} />
            <SidebarItem href="/playlists" icon={<ListVideo className="h-5 w-5 flex-shrink-0" />} label="Playlists" active={isActivePath(pathname, "/playlists")} collapsed={true} />
            <SidebarItem href="/categories" icon={<LayoutGrid className="h-5 w-5 flex-shrink-0" />} label="Categories" active={isActivePath(pathname, "/categories")} collapsed={true} />
            {/* History — expanded view only; uncomment to also show in mini bar */}
            {/* <SidebarItem href="/history" icon={<History className="h-5 w-5 flex-shrink-0" />} label="History" active={isActivePath(pathname, "/history")} collapsed={true} /> */}
            {/* Watch Later — hidden; uncomment to re-enable */}
            {/* <SidebarItem href="/watch-later" icon={<Clock className="h-5 w-5 flex-shrink-0" />} label="Watch Later" active={isActivePath(pathname, "/watch-later")} collapsed={true} /> */}
            {/* Liked Videos — hidden; uncomment to re-enable */}
            {/* <SidebarItem href="/liked-videos" icon={<ThumbsUp className="h-5 w-5 flex-shrink-0" />} label="Liked Videos" active={isActivePath(pathname, "/liked-videos")} collapsed={true} /> */}
          </>
        ) : (
          <SidebarExpandedContent pathname={pathname} />
        )}
      </div>
    </aside>
  );
}

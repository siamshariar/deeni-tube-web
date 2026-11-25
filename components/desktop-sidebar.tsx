// components/desktop-sidebar.tsx
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Menu,
  PlaySquare,
  Users,
  GraduationCap,
  LayoutGrid,
  ListVideo,
  // Clock,    // Watch Later — hidden
  // ThumbsUp, // Liked Videos — hidden
} from "lucide-react";
import { cn, isActivePath } from "@/lib/utils";
import { isVideoPath } from "@/lib/video-url";
import { useHeader } from "@/app/contexts/header-context";
import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import Logo from "@/components/logo";
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
  const openerRef = useRef<HTMLElement | null>(null);
  const wide = useMediaQuery("(min-width: 768px)"); // (a phone turned upright has no sidebar)
  const overlayOpen = overlayOpenOn !== null && overlayOpenOn === pathname && wide;

  // Overlay mode: video detail pages and playlist detail pages.
  // The sidebar appears as a slide-in overlay — content never shifts.
  const isOverlayPage =
    isVideoPath(pathname) ||
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
        openerRef.current = document.activeElement as HTMLElement | null;
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
  // YouTube's, measured: over the whole window, also the header, with the menu button and the logo where the header
  // has them; 240px, no border or shadow, half black behind it, 0.2s. The page stays where it is and the video goes on.
  // Closed by a click beside it, Escape, the menu button or a link.
  const closeOverlay = () => setOverlayOpenOn(null);
  const overlay = (
    <Dialog.Root open={overlayOpen} onOpenChange={(open) => setOverlayOpenOn(open ? pathname : null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 ![animation-duration:200ms] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          // The focus goes back to the menu button
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            openerRef.current?.focus({ preventScroll: true });
          }}
          className="fixed inset-y-0 left-0 z-50 flex w-[calc(240px+var(--sal))] flex-col bg-background pl-[var(--sal)] text-foreground outline-none ![animation-duration:200ms] data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left"
        >
          <Dialog.Title className="sr-only">Main menu</Dialog.Title>
          <div className="flex h-14 flex-shrink-0 items-center gap-4 pl-4">
            <Dialog.Close className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted active:bg-accent" aria-label="Close the menu">
              <Menu className="h-6 w-6" />
            </Dialog.Close>
            <Link href="/" onClick={closeOverlay}>
              <Logo height={28} className="h-7 w-auto" />
            </Link>
          </div>
          <div className="yt-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain py-3">
            <SidebarExpandedContent pathname={pathname} onLinkClick={closeOverlay} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
  if (isOverlayPage) return overlay;

  // ── NORMAL MODE (all other pages) ─────────────────────────────────────────
  return (
    <>
    {overlay /* closing, after a link in it */}
    <aside
      aria-label="Main menu"
      className={cn(
        "desktop-sidebar hidden md:flex flex-col fixed left-[var(--sal)] bg-background overflow-y-auto overflow-x-hidden flex-shrink-0 z-30 transition-all duration-300 ease-in-out yt-scrollbar",
        isCollapsed ? "w-[72px]" : "w-[240px]",
        top,
        height
      )}
    >
      <div className={cn("flex w-full flex-1 flex-col", isCollapsed ? "py-1" : "py-3")}>
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
    </>
  );
}

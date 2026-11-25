// components/app-header.tsx
"use client";

import { loadRecentSearches, saveRecentSearches } from "@/lib/recent-searches";
import { useState, useEffect, useRef } from "react";
import Logo from "@/components/logo";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, X, UserCircle, History, Menu } from "lucide-react";
import { MicIcon } from "@/components/icons/action-icons";
import { Button } from "@/components/ui/button";
import AccountDropdown from "@/components/account-dropdown";
import NotificationDropdown from "@/components/notification-dropdown";
import { openVoice } from "@/lib/voice";
import { cn, isActivePath } from "@/lib/utils";
import { useHeader } from "@/app/contexts/header-context";
import { useMediaQuery } from "@/hooks/use-media-query";
import { THEATER_SCREENS, useTheater } from "@/lib/theater";
import { isShortsPath } from "@/lib/share-path";
import { isVideoPath } from "@/lib/video-url";

// A 24px icon in a 48px circle
const ICON_BUTTON = "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full transition-colors active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const { headerVisible } = useHeader();

  // Desktop search state
  const [desktopSearchQuery, setDesktopSearchQuery] = useState("");
  const [showDesktopRecent, setShowDesktopRecent] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  // Theater mode: the header over the player is dark in the light theme too, as on YouTube
  const barRef = useRef<HTMLElement>(null);
  const theater = useTheater();
  const inTheater = useMediaQuery(THEATER_SCREENS) && theater && (isVideoPath(pathname) || !!pathname?.startsWith("/playlists/"));
  useEffect(() => { barRef.current?.classList.toggle("dark", inTheater); }, [inTheater]);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const prefs = localStorage.getItem("deeni-lang-prefs");
        setIsLoggedIn(prefs ? !JSON.parse(prefs).isGuest : false);
      } catch {
        setIsLoggedIn(false);
      }
      setAuthLoaded(true);
    };
    checkAuth();
    window.addEventListener("storage", checkAuth);
    window.addEventListener("auth-changed", checkAuth);
    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("auth-changed", checkAuth);
    };
  }, []);

  // Keep the input in sync with ?q when landing on /search (e.g. via a link or reload)
  useEffect(() => {
    if (!isActivePath(pathname, "/search")) return; // the results, and a video opened from them
    const q = new URLSearchParams(window.location.search).get("q");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads ?q from the browser URL after navigation
    if (q) setDesktopSearchQuery(q);
  }, [pathname]);

  useEffect(() => {
    if (!showDesktopRecent) return;
    const handler = (e: MouseEvent) => {
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(e.target as Node)) {
        setShowDesktopRecent(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDesktopRecent]);

  const handleDesktopSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = desktopSearchQuery.trim();
    if (!q) return;
    saveRecentSearches([q, ...loadRecentSearches().filter(s => s !== q)].slice(0, 8));
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setShowDesktopRecent(false);
    searchRef.current?.blur();
  };

  const searchRef = useRef<HTMLInputElement>(null);
  const openRecent = () => {
    setRecentSearches(loadRecentSearches());
    setShowDesktopRecent(true);
  };
  // What was typed narrows the list, as on YouTube
  const typed = desktopSearchQuery.trim().toLowerCase();
  const shownRecent = recentSearches.filter((s) => s.toLowerCase().includes(typed));

  const handleRecentClick = (search: string) => {
    searchRef.current?.blur();
    setDesktopSearchQuery(search);
    setShowDesktopRecent(false);
    saveRecentSearches([search, ...loadRecentSearches().filter(s => s !== search)].slice(0, 8));
    router.push(`/search?q=${encodeURIComponent(search)}`);
  };

  const removeRecent = (search: string) => {
    const updated = recentSearches.filter(s => s !== search);
    setRecentSearches(updated);
    saveRecentSearches(updated);
  };

  const clearRecent = () => {
    setRecentSearches([]);
    saveRecentSearches([]);
  };

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.__sidebarToggle) {
      window.__sidebarToggle();
    }
  };

  // The sign-in page is a standalone screen with its own header (back, logo, language)
  if (pathname === "/signin") return null;

  const userArea = (
    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center">
      {!authLoaded ? (
        <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
      ) : isLoggedIn ? (
        <AccountDropdown />
      ) : (
        <Link href="/signin" aria-label="Sign in" className={ICON_BUTTON}>
          <UserCircle className="h-6 w-6" />
        </Link>
      )}
    </div>
  );

  return (
    <>
      {/* ── Mobile Header ─────────────────────────────────────────────── */}
      <header
        className={cn(
          "safe-x md:hidden fixed top-0 left-0 right-0 bg-background z-40 w-full max-w-[100vw] transition-transform duration-300 ease-in-out",
          (!headerVisible || isShortsPath(pathname)) && "-translate-y-full"
        )}
      >
        {/* (m.youtube.com's: 24px icons and avatar in 48px, the last one 12px from the edge) */}
        <div className="flex items-center justify-between pl-3 w-full h-14">
          <Link href="/" className="min-w-0">
            <Logo height={24} className="h-6 w-auto max-w-full object-contain object-left" />
          </Link>

          <div className="flex items-center flex-shrink-0">
            {/* Search icon → opens the phone search screen directly (no page nav) */}
            <button type="button" aria-label="Search" onClick={() => window.dispatchEvent(new CustomEvent("open-search-modal"))} className={ICON_BUTTON}>
              <Search className="h-6 w-6" />
            </button>
            {/* (narrower phones have it on the search screen, as on YouTube's mobile site) */}
            <button type="button" aria-label="Search with your voice" onClick={() => openVoice(handleRecentClick)} className={cn(ICON_BUTTON, "hidden min-[480px]:flex")}>
              <MicIcon className="h-6 w-6" />
            </button>
            <NotificationDropdown />
            {userArea}
          </div>
        </div>
      </header>

      {/* ── Desktop Header ────────────────────────────────────────────── */}
      <header
        ref={barRef}
        suppressHydrationWarning // a script in app/layout.tsx makes it dark before first paint in theater mode
        className={cn(
          "app-bar safe-x hidden md:flex fixed top-0 left-0 right-0 bg-background text-foreground z-40 w-full max-w-[100vw] flex-col transition-transform duration-300 ease-in-out",
          !headerVisible && "-translate-y-full",
          inTheater && "dark"
        )}
      >
        <div className="flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4 flex-shrink-0">
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-muted active:bg-accent transition-colors"
              type="button"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href="/">
              <Logo height={28} className="h-7 w-auto" />
            </Link>
          </div>

          {/* Search, as on YouTube (measured): the box is at most 536px; focused it grows 32px to the left, with an icon in
              it, and the text stays where it is. The list under it is as wide as that box. */}
          <div className="flex min-w-0 flex-[0_1_732px] items-center" ref={desktopSearchRef}>
            <form role="search" onSubmit={handleDesktopSearchSubmit} className="relative ml-10 flex min-w-0 flex-1 items-center px-1">
              <div className="group/box relative ml-8 flex h-10 min-w-0 flex-1 cursor-text items-center rounded-l-full border border-r-0 border-[#c6c6c6] bg-white pl-4 pr-1 shadow-[inset_0_1px_2px_#eee] focus-within:ml-0 focus-within:border-r focus-within:border-[#1c62b9] focus-within:pl-12 focus-within:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] dark:border-[#303030] dark:bg-[#121212] dark:!shadow-none dark:focus-within:border-[#1c62b9]">
                <Search aria-hidden="true" className="pointer-events-none absolute left-4 hidden h-5 w-5 group-focus-within/box:block" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search"
                  aria-label="Search"
                  autoComplete="off"
                  enterKeyHint="search"
                  value={desktopSearchQuery}
                  onChange={e => setDesktopSearchQuery(e.target.value)}
                  onFocus={openRecent}
                  onClick={openRecent}
                  onKeyDown={e => { if (e.key === "Escape") { setShowDesktopRecent(false); e.currentTarget.blur(); } }}
                  className="h-full min-w-0 flex-1 bg-transparent text-base leading-[22px] text-foreground outline-none placeholder:text-[#757575] dark:placeholder:text-[#8c8c8c]"
                />
                {desktopSearchQuery && (
                  <span className="relative h-6 w-6 flex-shrink-0">
                    <button
                      onClick={() => { setDesktopSearchQuery(""); searchRef.current?.focus(); }}
                      className="absolute -inset-2 flex items-center justify-center rounded-full"
                      type="button"
                      aria-label="Clear search"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </span>
                )}
              </div>
              <button
                type="submit"
                aria-label="Search"
                title="Search"
                className="flex h-10 w-16 flex-shrink-0 items-center justify-center rounded-r-full border border-[#d3d3d3] bg-[#f8f8f8] transition-colors hover:bg-[#f0f0f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring dark:border-[#303030] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
              >
                <Search className="h-6 w-6" />
              </button>

              {showDesktopRecent && shownRecent.length > 0 && (
                // (a press in it keeps the box focused, so it doesn't shrink under the list)
                <div onMouseDown={e => e.preventDefault()} className="absolute left-1 right-[66px] top-[calc(100%+4px)] z-50 overflow-hidden rounded-xl border bg-popover py-2 text-popover-foreground shadow-[0_2px_4px_rgba(0,0,0,0.2)] dark:border-transparent dark:bg-[#212121]">
                  <div className="yt-scrollbar max-h-[min(656px,calc(100vh-120px))] overflow-y-auto px-2">
                    {shownRecent.map(search => (
                      <div key={search} className="group/row flex h-11 items-center rounded-lg transition-colors hover:bg-muted dark:hover:bg-white/10">
                        <button type="button" onClick={() => handleRecentClick(search)} className="flex h-full min-w-0 flex-1 items-center gap-3.5 pl-4 text-left text-base">
                          <History aria-hidden="true" className="h-5 w-5 flex-shrink-0" />
                          <span className="truncate">{search}</span>
                        </button>
                        <button type="button" onClick={() => removeRecent(search)} aria-label={`Remove "${search}" from recent searches`} className="mr-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end px-4 pt-1">
                    <button type="button" onClick={clearRecent} className="h-8 text-sm font-medium text-muted-foreground hover:text-foreground">Clear all</button>
                  </div>
                </div>
              )}
            </form>
            <button
              type="button"
              aria-label="Search with your voice"
              title="Search with your voice"
              onClick={() => { setShowDesktopRecent(false); openVoice(handleRecentClick); }}
              className="ml-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-black/5 transition-colors hover:bg-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-white/10 dark:hover:bg-white/20"
            >
              <MicIcon className="h-6 w-6" />
            </button>
          </div>

          {/* (as wide as it takes for the search to stand where YouTube's does) */}
          <div className="flex items-center justify-end gap-2 flex-shrink-0 min-[1280px]:min-w-[267px]">
            <NotificationDropdown />
            <div className="flex items-center justify-end">
              {!authLoaded ? (
                <div className="mx-1.5 h-8 w-8 rounded-full bg-muted animate-pulse" />
              ) : isLoggedIn ? (
                <AccountDropdown />
              ) : (
                <Button asChild variant="outline" className="rounded-full flex items-center gap-1.5 h-10 text-sm font-medium pl-[11px] pr-[15px] [&_svg]:size-6 text-[#065fd4] dark:text-[#3ea6ff] border-border bg-transparent hover:bg-[#def1ff] dark:hover:bg-[#263850] hover:text-[#065fd4] dark:hover:text-[#3ea6ff] hover:border-transparent">
                  <Link href="/signin">
                    <UserCircle className="h-6 w-6" />
                    <span>Sign in</span>
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

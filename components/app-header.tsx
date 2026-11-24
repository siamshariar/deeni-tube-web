// components/app-header.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Logo from "@/components/logo";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, Mic, X, UserCircle, History, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import AccountDropdown from "@/components/account-dropdown";
import NotificationDropdown from "@/components/notification-dropdown";
import { VoiceSearchDialog } from "@/components/voice-search";
import { cn, isActivePath } from "@/lib/utils";
import { useHeader } from "@/app/contexts/header-context";

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
  const [voiceOpen, setVoiceOpen] = useState(false);

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

  const loadRecentSearches = () => {
    try {
      const stored = localStorage.getItem("recentSearches");
      setRecentSearches(stored ? JSON.parse(stored) : []);
    } catch {
      setRecentSearches([]);
    }
  };

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
    try {
      const stored = localStorage.getItem("recentSearches");
      let searches: string[] = stored ? JSON.parse(stored) : [];
      searches = [q, ...searches.filter(s => s !== q)].slice(0, 8);
      localStorage.setItem("recentSearches", JSON.stringify(searches));
    } catch {}
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setShowDesktopRecent(false);
  };

  const handleRecentClick = (search: string) => {
    setDesktopSearchQuery(search);
    setShowDesktopRecent(false);
    try {
      const stored = localStorage.getItem("recentSearches");
      let searches: string[] = stored ? JSON.parse(stored) : [];
      searches = [search, ...searches.filter(s => s !== search)].slice(0, 8);
      localStorage.setItem("recentSearches", JSON.stringify(searches));
    } catch {}
    router.push(`/search?q=${encodeURIComponent(search)}`);
  };

  const removeRecent = (search: string) => {
    const updated = recentSearches.filter(s => s !== search);
    setRecentSearches(updated);
    try { localStorage.setItem("recentSearches", JSON.stringify(updated)); } catch {}
  };

  const clearRecent = () => {
    setRecentSearches([]);
    try { localStorage.removeItem("recentSearches"); } catch {}
  };

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.__sidebarToggle) {
      window.__sidebarToggle();
    }
  };

  // The sign-in page is a standalone screen with its own header (back, logo, language)
  if (pathname === "/signin") return null;

  const userArea = (
    <div className="flex items-center gap-1 flex-shrink-0 min-w-[36px] justify-center">
      {!authLoaded ? (
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      ) : isLoggedIn ? (
        <AccountDropdown />
      ) : (
        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full">
          <Link href="/signin" aria-label="Sign in">
            <UserCircle className="h-6 w-6" />
          </Link>
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* ── Mobile Header ─────────────────────────────────────────────── */}
      <header
        className={cn(
          "safe-x md:hidden fixed top-0 left-0 right-0 bg-background z-40 w-full max-w-[100vw] transition-transform duration-300 ease-in-out",
          (!headerVisible || pathname === "/shorts") && "-translate-y-full"
        )}
      >
        <div className="flex items-center justify-between px-2 py-2 w-full h-14">
          <Link href="/" className="min-w-0 pl-1">
            <Logo height={24} className="h-6 w-auto max-w-full object-contain object-left" />
          </Link>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Search icon → opens global mobile search modal directly (no page nav) */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              aria-label="Search"
              onClick={() => window.dispatchEvent(new CustomEvent("open-search-modal"))}
            >
              <Search className="h-6 w-6" />
            </Button>
            <NotificationDropdown />
            {userArea}
          </div>
        </div>
      </header>

      {/* ── Desktop Header ────────────────────────────────────────────── */}
      <header
        className={cn(
          "safe-x hidden md:flex fixed top-0 left-0 right-0 bg-background z-40 w-full max-w-[100vw] flex-col transition-transform duration-300 ease-in-out",
          !headerVisible && "-translate-y-full"
        )}
      >
        <div className="flex h-14 items-center justify-between px-4">
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

          {/* Desktop search bar */}
          <div className="flex-1 max-w-[720px] mx-4 min-w-0" ref={desktopSearchRef}>
            <form onSubmit={handleDesktopSearchSubmit} className="flex items-center">
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Search"
                  value={desktopSearchQuery}
                  onChange={e => setDesktopSearchQuery(e.target.value)}
                  onFocus={() => { loadRecentSearches(); setShowDesktopRecent(true); }}
                  onClick={() => { loadRecentSearches(); setShowDesktopRecent(true); }}
                  className="w-full h-10 py-2 pl-4 pr-10 rounded-l-full border border-input border-r-0 text-base placeholder:text-muted-foreground focus:outline-none focus:border-[#1c62b9] focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)] dark:focus:border-[#3ea6ff] bg-background text-foreground"
                />
                {desktopSearchQuery && (
                  <button
                    onClick={() => setDesktopSearchQuery("")}
                    className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    type="button"
                    aria-label="Clear search"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}

                {showDesktopRecent && recentSearches.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="flex h-14 items-center justify-between px-4">
                      <span className="text-xs font-medium text-muted-foreground">Recent searches</span>
                      <button type="button" onClick={clearRecent} className="text-xs text-primary">Clear all</button>
                    </div>
                    <div className="yt-scrollbar max-h-64 overflow-y-auto">
                      {recentSearches.map(search => (
                        <div
                          key={search}
                          className="w-full flex items-center justify-between px-4 hover:bg-muted transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => handleRecentClick(search)}
                            className="flex flex-1 min-w-0 items-center gap-3 py-2.5"
                          >
                            <History className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <span className="text-sm text-left truncate">{search}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRecent(search)}
                            aria-label={`Remove "${search}" from recent searches`}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-r-full h-10 w-16 border border-input bg-[#f8f8f8] hover:bg-[#f0f0f0] dark:bg-[#222] dark:hover:bg-[#2a2a2a] flex-shrink-0"
                type="submit"
                aria-label="Search"
              >
                <Search className="w-6 h-6" />
              </Button>
              <Button type="button" aria-label="Search with your voice" title="Search with your voice" onClick={() => { setShowDesktopRecent(false); setVoiceOpen(true); }} variant="ghost" size="icon" className="h-10 w-10 rounded-full ml-3 bg-muted hover:bg-accent flex-shrink-0">
                <Mic className="w-6 h-6" />
              </Button>
            </form>
            <VoiceSearchDialog
              open={voiceOpen}
              onOpenChange={setVoiceOpen}
              onResult={(text) => { setVoiceOpen(false); handleRecentClick(text); }}
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <NotificationDropdown />
            <div className="flex items-center justify-end">
              {!authLoaded ? (
                <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
              ) : isLoggedIn ? (
                <AccountDropdown />
              ) : (
                <Button asChild variant="outline" className="rounded-full flex items-center gap-1.5 h-9 text-sm font-medium pl-2 pr-3 text-[#065fd4] dark:text-[#3ea6ff] border-border bg-transparent hover:bg-[#def1ff] dark:hover:bg-[#263850] hover:text-[#065fd4] dark:hover:text-[#3ea6ff] hover:border-transparent">
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

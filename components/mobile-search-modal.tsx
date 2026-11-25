"use client";

import { loadRecentSearches, saveRecentSearches } from "@/lib/recent-searches";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, History } from "lucide-react";
import { MicIcon } from "@/components/icons/action-icons";
import { MultiSelect } from "@/components/multi-select";
import { BackButton } from "@/components/page-bar";
import { CHIP, CHIP_OFF, CHIP_ON } from "@/components/page-layout";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { openVoice } from "@/lib/voice";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { videoData } from "@/lib/video-data";
import { channelData, ChannelItem } from "@/lib/channel-data";
import { scholarData } from "@/lib/scholar-data";
import { SEARCH_LANGUAGES, getDefaultSearchLangs, isDefaultSearchLangs, parseSearchLangs } from "@/lib/search-languages";

// ── Static options ────────────────────────────────────────────────────────────

const LANGUAGES = SEARCH_LANGUAGES;

const categoryOptions = Array.from(new Set(videoData.map(v => v.category).filter(Boolean)));
const scholarOptions  = scholarData.map(s => s.name);
const channelOptions  = channelData.map((c: ChannelItem) => c.name);

// ── Global mobile search modal ────────────────────────────────────────────────
// Always mounted in the layout. Opens via: window.dispatchEvent(new CustomEvent("open-search-modal"))
// After Search is pressed: navigates to /search?q=...&filters...

export default function MobileSearchModal() {
  const router = useRouter();

  const [isOpen, setIsOpen]                     = useState(false);
  const [query, setQuery]                       = useState("");
  const [activeLangs, setActiveLangs]           = useState<string[]>(() => getDefaultSearchLangs());
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedScholars, setSelectedScholars] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [recentList, setRecentList]             = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const keyboard = useKeyboardInset(isOpen);

  // Listen for the open event dispatched by the header search icon
  useEffect(() => {
    const handleOpen = () => {
      // Pre-populate query from URL when reopening on /search page
      const params = new URLSearchParams(window.location.search);
      const urlQ   = params.get("q") || "";
      if (urlQ) setQuery(urlQ);
      setActiveLangs(parseSearchLangs(/^\/search(\/|$)/.test(window.location.pathname) ? params.get("lang") : null));

      setRecentList(loadRecentSearches());
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 80);
    };

    window.addEventListener("open-search-modal", handleOpen);
    return () => window.removeEventListener("open-search-modal", handleOpen);
  }, []);

  const close = () => setIsOpen(false);

  const hasActiveFilters = selectedCategories.length > 0 || selectedScholars.length > 0 || selectedChannels.length > 0;

  const resetFilters = () => {
    setActiveLangs(getDefaultSearchLangs());
    setSelectedCategories([]);
    setSelectedScholars([]);
    setSelectedChannels([]);
  };

  const toggleLang = (code: string) =>
    setActiveLangs(prev =>
      prev.includes(code)
        ? prev.length > 1 ? prev.filter(l => l !== code) : prev
        : [...prev, code]
    );

  const addToRecent = (term: string) => {
    if (!term) return;
    setRecentList(prev => {
      const updated = [term, ...prev.filter(s => s !== term)].slice(0, 8);
      saveRecentSearches(updated);
      return updated;
    });
  };

  const removeFromRecent = (s: string) =>
    setRecentList(prev => { const u = prev.filter(x => x !== s); saveRecentSearches(u); return u; });

  const shownRecent = recentList.filter((s) => s.toLowerCase().includes(query.trim().toLowerCase()));

  const handleSearch = () => {
    const term = query.trim();
    if (!term && !hasActiveFilters) return;

    if (term) addToRecent(term);

    // Build URL with all active filters so /search page can apply them on mount
    const params = new URLSearchParams();
    if (term) params.set("q", term);
    // Only include lang if it differs from the user's default languages
    if (!isDefaultSearchLangs(activeLangs))
      params.set("lang", activeLangs.join(","));
    if (selectedCategories.length > 0) params.set("cat", selectedCategories.join(","));
    if (selectedScholars.length > 0)   params.set("scholar", selectedScholars.join(","));
    if (selectedChannels.length > 0)   params.set("ch", selectedChannels.join(","));

    router.push(`/search?${params.toString()}`);
    close();
  };

  const handleRecentTap = (s: string) => {
    setQuery(s);
    addToRecent(s);
    // Navigate immediately on recent tap (no extra filters assumed)
    const params = new URLSearchParams();
    params.set("q", s);
    if (!isDefaultSearchLangs(activeLangs))
      params.set("lang", activeLangs.join(","));
    router.push(`/search?${params.toString()}`);
    close();
  };

  if (!isOpen) return null;

  return (
    // Above the phone's keyboard, so the Search button isn't behind it
    <div className="md:hidden safe-x fixed inset-0 z-[60] bg-background flex flex-col" style={{ paddingBottom: keyboard }}>

      {/* ── The bar, YouTube's: back, the box with its search button, the microphone (gone while there's text) ── */}
      <div className="flex h-14 flex-shrink-0 items-center gap-1 pl-0.5 pr-2">
        <BackButton label="Close search" onClick={close} />
        <form
          role="search"
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
          className="flex h-10 min-w-0 flex-1 items-center rounded-full bg-muted pl-4"
        >
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            aria-label="Search videos, scholars, channels"
            placeholder="Search Deeni.tube"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-full min-w-0 flex-1 text-ellipsis bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="flex h-10 w-9 flex-shrink-0 items-center justify-center">
              <X className="h-5 w-5" />
            </button>
          )}
          <button type="submit" aria-label="Search" disabled={!query.trim() && !hasActiveFilters} className="flex h-10 w-11 flex-shrink-0 items-center justify-center rounded-r-full pr-1">
            <Search className="h-6 w-6" />
          </button>
        </form>
        {!query && (
          <button
            type="button"
            aria-label="Search with your voice"
            onClick={() => openVoice(handleRecentTap)}
            className="ml-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted transition-colors active:bg-accent"
          >
            <MicIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* ── Scrollable filter body ───────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Recent searches, narrowed by what is typed */}
        {shownRecent.length > 0 && (
          <div className="border-b pb-2">
            <div className="flex items-center justify-between pl-3 pr-2">
              <span className="text-sm font-medium">Recent searches</span>
              <Button variant="ghost" className="h-9 px-3" onClick={() => { setRecentList([]); saveRecentSearches([]); }}>
                Clear all
              </Button>
            </div>
            {shownRecent.map((s) => (
              <div key={s} className="flex items-center pr-1">
                <button type="button" onClick={() => handleRecentTap(s)} className="flex min-h-11 min-w-0 flex-1 items-center gap-4 px-3 text-left transition-colors active:bg-accent">
                  <History className="h-5 w-5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1 truncate text-[15px]">{s}</span>
                </button>
                <button type="button" aria-label={`Remove "${s}" from recent searches`} onClick={() => removeFromRecent(s)} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-accent">
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Filter sections ────────────────────────────────────────── */}
        <div className="space-y-6 px-3 py-5">
          <div>
            <div className="mb-2 flex min-h-9 items-center justify-between">
              <p className="text-sm font-medium">Language</p>
              {(hasActiveFilters || !isDefaultSearchLangs(activeLangs)) && (
                <Button variant="ghost" className="-mr-1 h-9 px-3" onClick={resetFilters}>
                  Clear filters
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button key={lang.code} type="button" aria-pressed={activeLangs.includes(lang.code)} onClick={() => toggleLang(lang.code)} className={cn(CHIP, activeLangs.includes(lang.code) ? CHIP_ON : CHIP_OFF)}>
                  {lang.name}
                </button>
              ))}
            </div>
          </div>
          <MultiSelect closeOnPick label="Categories" options={categoryOptions} selected={selectedCategories} onChange={setSelectedCategories} />
          <MultiSelect closeOnPick label="Scholars" options={scholarOptions} selected={selectedScholars} onChange={setSelectedScholars} />
          <MultiSelect closeOnPick label="Channels" options={channelOptions} selected={selectedChannels} onChange={setSelectedChannels} />
        </div>
      </div>

      {/* ── Sticky Search button ─────────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-t px-3 py-2"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Button
          onClick={handleSearch}
          disabled={!query.trim() && !hasActiveFilters}
          className="h-11 w-full text-[15px]"
        >
          <Search />
          Search
        </Button>
      </div>
    </div>
  );
}

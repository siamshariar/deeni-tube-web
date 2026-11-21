"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, Clock, Bookmark, Share,
  SlidersHorizontal, Check, ChevronDown, X,
} from "lucide-react";
import { MoreButton } from "@/components/more-button";
import { youtubeThumb } from "@/lib/media-lookup";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import Link from "next/link";
import { WatchedBar } from "@/components/watched-bar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareModal } from "@/components/share-modal";
import { AddToPlaylistDialog } from "@/components/add-to-playlist-dialog";
import {
  Drawer, DrawerContent,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { videoData, VideoItem } from "@/lib/video-data";
import { channelData, ChannelItem } from "@/lib/channel-data";
import { scholarData } from "@/lib/scholar-data";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useWatchLater } from "@/hooks/useWatchLater";
import { SEARCH_LANGUAGES, getDefaultSearchLangs, isDefaultSearchLangs, parseSearchLangs } from "@/lib/search-languages";
import { videoPath } from "@/lib/video-url";
import { InlinePreview } from "@/components/inline-preview";

// ── Static data ──────────────────────────────────────────────────────────────

const LANGUAGES = SEARCH_LANGUAGES;

const categoryOptions = Array.from(new Set(videoData.map(v => v.category).filter(Boolean)));
const scholarOptions  = scholarData.map(s => s.name);
const channelOptions  = channelData.map((c: ChannelItem) => c.name);

const channelNameToId = new Map<string, string>();
channelData.forEach((ch: ChannelItem) => channelNameToId.set(ch.name, ch.id));

const scholarNameToChannelId = new Map<string, string>();
scholarData.forEach((s) => scholarNameToChannelId.set(s.name, s.channelId));

type SearchFilters = { langs: string[]; cats: string[]; scholars: string[]; channels: string[] };

// ── Desktop-only MultiSelect ──────────────────────────────────────────────────

function MultiSelect({
  label, options, selected, onChange, searchable = false,
}: {
  label: string; options: string[]; selected: string[];
  onChange: (v: string[]) => void; searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setText("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v]);

  const remove = (v: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(s => s !== v));
  };

  const filtered = text
    ? options.filter(o => o.toLowerCase().includes(text.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full min-h-[42px] px-3 py-2 flex items-center gap-2 flex-wrap rounded-xl border text-left transition-colors bg-background",
          open ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-muted-foreground/60"
        )}
      >
        <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
          {selected.length === 0 ? (
            <span className="text-sm text-muted-foreground">Any {label.toLowerCase()}…</span>
          ) : selected.map(val => (
            <span key={val} className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
              {val}
              <span
                role="button" tabIndex={0}
                onClick={e => remove(val, e as unknown as React.MouseEvent)}
                className="cursor-pointer hover:opacity-70"
              >
                <X className="h-3 w-3" />
              </span>
            </span>
          ))}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-xl shadow-xl overflow-hidden">
          {searchable && (
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  autoFocus type="text" value={text}
                  onChange={e => setText(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  placeholder={`Search ${label.toLowerCase()}…`}
                  className="w-full h-8 pl-8 pr-2 text-sm rounded-lg border bg-muted/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>
          )}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0
              ? <p className="px-4 py-3 text-sm text-muted-foreground text-center">No results</p>
              : filtered.map(opt => {
                  const sel = selected.includes(opt);
                  return (
                    <button key={opt} type="button" onClick={() => toggle(opt)}
                      className={cn("w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors", sel && "bg-muted/50 font-medium")}
                    >
                      <span className={cn("h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors", sel ? "bg-primary border-primary" : "border-muted-foreground/30")}>
                        {sel && <Check className="h-3 w-3 text-primary-foreground" />}
                      </span>
                      {opt}
                    </button>
                  );
                })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function VideoSkeleton() {
  return (
    <div className="flex gap-3 py-2">
      <Skeleton className="w-40 md:w-48 aspect-video rounded-xl flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2 pt-1">
        <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-24 mt-3" /><Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

// ── Result cards ──────────────────────────────────────────────────────────────

function ResultList({
  results, onShare, onPlaylist, onWatchLaterToggle, isInWatchLater, isMobile,
}: {
  results: VideoItem[];
  onShare: (v: VideoItem) => void;
  onPlaylist: (v: VideoItem) => void;
  onWatchLaterToggle: (v: VideoItem) => void;
  isInWatchLater: (id: string) => boolean;
  isMobile: boolean;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVideo, setDrawerVideo] = useState<VideoItem | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {results.map(video => (
        <div key={video.id} className="flex gap-3 md:gap-4 group">
          {/* Rest the mouse on the thumbnail: the video plays in it, as on YouTube (mouse only) */}
          <InlinePreview videoId={video.videoId} title={video.title} className="w-40 sm:w-60 md:w-80 lg:w-[360px] flex-shrink-0 self-start rounded-xl">
            <Link
              href={videoPath(video)}
              className="relative block w-full aspect-video rounded-xl overflow-hidden bg-muted"
            >
              <Image
                src={youtubeThumb(video.videoId)}
                alt={video.title} fill
                sizes="(min-width: 1024px) 360px, (min-width: 768px) 320px, (min-width: 640px) 240px, 160px"
                className="object-cover"
              />
              <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs px-1 py-px rounded font-medium">
                {video.duration}
              </div>
              <WatchedBar videoId={video.videoId} />
            </Link>
          </InlinePreview>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <Link href={videoPath(video)}>
                  <h3 className="line-clamp-2 text-[15px] font-medium leading-5 md:text-base md:leading-[22px]">
                    {video.title}
                  </h3>
                </Link>
                <p className="mt-1 text-[13px] leading-[18px] text-muted-foreground md:text-sm md:leading-5">{video.views} · {video.timeAgo}</p>
                <div className="flex items-center gap-2 mt-1 md:mt-3">
                  <Avatar className="hidden md:flex h-6 w-6">
                    <AvatarImage src={video.channelAvatar} alt="" />
                    <AvatarFallback className="text-[11px]">{video.channel.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-[13px] leading-[18px] text-muted-foreground md:text-sm md:leading-5">{video.channel}</span>
                </div>
                {video.description && (
                  <p className="hidden md:block text-[13px] leading-[18px] text-muted-foreground mt-2 line-clamp-2">{video.description}</p>
                )}
              </div>

              {/* Mobile: plain button → single Drawer below */}
              {isMobile ? (
                <MoreButton onClick={(e) => { e.stopPropagation(); setDrawerVideo(video); setDrawerOpen(true); }} />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <MoreButton />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-xl">
                    <DropdownMenuItem onSelect={() => onWatchLaterToggle(video)}>
                      <Clock className="h-4 w-4" /> {isInWatchLater(video.id) ? "Saved to Watch Later" : "Save to Watch Later"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onPlaylist(video); }}>
                      <Bookmark className="h-4 w-4" /> Save to playlist
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onShare(video); }}>
                      <Share className="h-4 w-4" /> Share
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Single Drawer outside map — avoids multiple backdrop stacking */}
      <Drawer open={drawerOpen} onOpenChange={(o) => { if (!o) { setDrawerOpen(false); setDrawerVideo(null); } }}>
        <DrawerContent className="px-0 max-h-[70vh]">
          <div className="mt-2 pb-6">
            <div
              className="flex items-center gap-4 px-4 py-3 text-[15px] hover:bg-muted active:bg-accent cursor-pointer"
              onClick={() => { setDrawerOpen(false); if (drawerVideo) onWatchLaterToggle(drawerVideo); }}
            >
              <Clock className="h-5 w-5" />
              {drawerVideo && isInWatchLater(drawerVideo.id) ? "Saved to Watch Later" : "Save to Watch Later"}
            </div>
            <div
              className="flex items-center gap-4 px-4 py-3 text-[15px] hover:bg-muted active:bg-accent cursor-pointer"
              onClick={() => { setDrawerOpen(false); setTimeout(() => { if (drawerVideo) onPlaylist(drawerVideo); }, 150); }}
            >
              <Bookmark className="h-5 w-5" /> Save to playlist
            </div>
            <div
              className="flex items-center gap-4 px-4 py-3 text-[15px] hover:bg-muted active:bg-accent cursor-pointer"
              onClick={() => { setDrawerOpen(false); if (drawerVideo) onShare(drawerVideo); }}
            >
              <Share className="h-5 w-5" /> Share
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function SearchPageContent() {
  const searchParams = useSearchParams();
  const isMobile     = useMediaQuery("(max-width: 767px)");

  // Read all filter params from URL (set by MobileSearchModal after search)
  const initialQuery     = searchParams?.get("q")      || "";
  const langParam        = searchParams?.get("lang") ?? null;
  const initialCats      = searchParams?.get("cat")?.split(",").filter(Boolean)  || [];
  const initialScholars  = searchParams?.get("scholar")?.split(",").filter(Boolean) || [];
  const initialChannels  = searchParams?.get("ch")?.split(",").filter(Boolean)   || [];

  // Search state — initialised from URL params
  const [activeLangs, setActiveLangs]               = useState<string[]>(() => parseSearchLangs(langParam));
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCats);
  const [selectedScholars, setSelectedScholars]     = useState<string[]>(initialScholars);
  const [selectedChannels, setSelectedChannels]     = useState<string[]>(initialChannels);

  // Results
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [results, setResults]         = useState<VideoItem[]>([]);

  // Desktop UI
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);
  const [shareModalOpen, setShareModalOpen]         = useState(false);
  const [shareUrl, setShareUrl]                     = useState("");

  // Watch Later + Playlist
  const { addToWatchLater, removeFromWatchLater, isInWatchLater } = useWatchLater();
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);

  const handleWatchLaterToggle = (video: VideoItem) => {
    if (isInWatchLater(video.id)) {
      removeFromWatchLater(video.id);
      toast.success("Removed from Watch Later");
    } else {
      addToWatchLater({
        id: video.id, title: video.title, channel: video.channel,
        channelAvatar: video.channelAvatar || "",
        thumbnail: `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`,
        views: video.views, timeAgo: video.timeAgo, duration: video.duration,
        addedAt: Date.now(),
      });
      toast.success("Saved to Watch Later");
    }
  };

  const handlePlaylist = (video: VideoItem) => {
    setSelectedVideo(video);
    setShowPlaylistDialog(true);
  };

  const performSearchRef = useRef<((q?: string) => void) | null>(null);

  const hasActiveFilters  = selectedCategories.length > 0 || selectedScholars.length > 0 || selectedChannels.length > 0;
  const activeFilterCount =
    (isDefaultSearchLangs(activeLangs) ? 0 : 1) +
    (selectedCategories.length > 0 ? 1 : 0) +
    (selectedScholars.length   > 0 ? 1 : 0) +
    (selectedChannels.length   > 0 ? 1 : 0);

  const toggleLang = (code: string) =>
    setActiveLangs(prev =>
      prev.includes(code)
        ? prev.length > 1 ? prev.filter(l => l !== code) : prev
        : [...prev, code]
    );

  const resetFilters = () => {
    setActiveLangs(getDefaultSearchLangs());
    setSelectedCategories([]);
    setSelectedScholars([]);
    setSelectedChannels([]);
  };

  // Each search gets a number so a slow, older search can't overwrite a newer one
  const searchSeq = useRef(0);

  const runSearch = useCallback((rawTerm: string, f: SearchFilters) => {
    const term          = rawTerm.trim();
    const filtersActive = f.cats.length > 0 || f.scholars.length > 0 || f.channels.length > 0;
    if (!term && !filtersActive) {
      searchSeq.current++;
      setHasSearched(false);
      setIsLoading(false);
      setResults([]);
      return;
    }

    const seq = ++searchSeq.current;
    setIsLoading(true);
    setHasSearched(true);

    setTimeout(() => {
      if (seq !== searchSeq.current) return;
      let filtered = [...videoData];

      if (term) {
        const lower = term.toLowerCase();
        filtered = filtered.filter(v =>
          v.title.toLowerCase().includes(lower) ||
          v.channel.toLowerCase().includes(lower) ||
          v.description.toLowerCase().includes(lower) ||
          // Most titles are in Bangla, so also match the English category ("quran", "dua", …)
          (v.category ?? "").toLowerCase().includes(lower)
        );
      }
      if (f.langs.length > 0)
        filtered = filtered.filter(v => f.langs.includes(v.language));
      if (f.cats.length > 0)
        filtered = filtered.filter(v => f.cats.includes(v.category));
      if (f.scholars.length > 0) {
        const ids = f.scholars.map(n => scholarNameToChannelId.get(n)).filter(Boolean) as string[];
        filtered = filtered.filter(v => ids.includes(v.channelId));
      }
      if (f.channels.length > 0) {
        const ids = f.channels.map(n => channelNameToId.get(n)).filter(Boolean) as string[];
        filtered = filtered.filter(v => ids.includes(v.channelId));
      }

      setResults(filtered);
      setIsLoading(false);
    }, 400);
  }, []);

  const performSearch = useCallback((overrideQuery?: string) => {
    runSearch(overrideQuery ?? initialQuery, {
      langs: activeLangs, cats: selectedCategories, scholars: selectedScholars, channels: selectedChannels,
    });
  }, [runSearch, initialQuery, activeLangs, selectedCategories, selectedScholars, selectedChannels]);

  useEffect(() => {
    performSearchRef.current = performSearch;
  }, [performSearch]);

  // Run the search whenever the URL changes (header search, mobile modal, back/forward)
  const urlKey = searchParams?.toString() ?? "";
  useEffect(() => {
    const f: SearchFilters = {
      langs: parseSearchLangs(langParam), cats: initialCats, scholars: initialScholars, channels: initialChannels,
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- filters mirror the URL, and this effect also starts the search
    setActiveLangs(f.langs);
    setSelectedCategories(f.cats);
    setSelectedScholars(f.scholars);
    setSelectedChannels(f.channels);
    runSearch(initialQuery, f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlKey]);

  // Desktop: auto-refresh results when filters change (after first search)
  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    if (isFirstFilterRender.current) { isFirstFilterRender.current = false; return; }
    if (isMobile || !hasSearched) return;
    const timer = setTimeout(() => performSearchRef.current?.(), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLangs, selectedCategories, selectedScholars, selectedChannels]);

  const openMobileModal = () =>
    window.dispatchEvent(new CustomEvent("open-search-modal"));

  const handleShare = (video: VideoItem) => {
    setShareUrl(`${window.location.origin}${videoPath(video)}`);
    setShareModalOpen(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background mt-14 md:mt-16">
      <h1 className="sr-only">{initialQuery ? `Search results for "${initialQuery}"` : "Search"}</h1>

      {/* ══════════════════════════════════════════════════════════
          DESKTOP — inline search bar + collapsible filter panel
      ══════════════════════════════════════════════════════════ */}
      <div className="hidden md:block max-w-5xl mx-auto px-6 py-6">

        {!hasSearched ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Search className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1">Search for Islamic content</h2>
            <p className="text-sm text-muted-foreground">Use the search bar above to find videos, scholars, and channels</p>
          </div>
        ) : (
          <>
            {/* Result count + Advanced Filters toggle */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Searching…" : (
                  <>
                    <span className="font-semibold text-foreground">{results.length}</span>
                    {` result${results.length !== 1 ? "s" : ""}${initialQuery ? ` for "${initialQuery}"` : ""}`}
                  </>
                )}
              </p>
              <button
                onClick={() => setShowDesktopFilters(v => !v)}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                  showDesktopFilters || activeFilterCount > 0
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-foreground border-border hover:bg-muted"
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Advanced Filters
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", showDesktopFilters && "rotate-180")} />
              </button>
            </div>

            {/* Collapsible filter panel */}
            {showDesktopFilters && (
              <div className="mb-6 p-5 border rounded-2xl bg-muted/10 space-y-5">
                {/* Language */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Language</p>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => toggleLang(lang.code)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors",
                          activeLangs.includes(lang.code)
                            ? "bg-foreground text-background"
                            : "bg-muted hover:bg-muted/80 text-foreground"
                        )}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </div>
                <MultiSelect label="Scholars"   options={scholarOptions}  selected={selectedScholars}   onChange={setSelectedScholars}   searchable />
                <MultiSelect label="Categories" options={categoryOptions} selected={selectedCategories} onChange={setSelectedCategories} searchable />
                <MultiSelect label="Channels"   options={channelOptions}  selected={selectedChannels}   onChange={setSelectedChannels}   searchable />
                {(hasActiveFilters || !isDefaultSearchLangs(activeLangs)) && (
                  <div className="flex justify-end border-t pt-2">
                    <button onClick={resetFilters} className="text-sm text-primary">
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <VideoSkeleton key={i} />)}</div>
            ) : results.length > 0 ? (
              <ResultList results={results} onShare={handleShare} onPlaylist={handlePlaylist} onWatchLaterToggle={handleWatchLaterToggle} isInWatchLater={isInWatchLater} isMobile={isMobile} />
            ) : (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No results found</h3>
                <p className="text-muted-foreground text-sm mb-4">Try different keywords or adjust your filters</p>
                {(hasActiveFilters || !isDefaultSearchLangs(activeLangs)) && (
                  <Button variant="outline" className="rounded-full" onClick={resetFilters}>Clear filters</Button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          MOBILE — results only; modal lives in the global layout
      ══════════════════════════════════════════════════════════ */}
      <div className="md:hidden">
        {!hasSearched ? (
          /* Landing state — modal is already open (dispatched on mount below),
             but show a subtle prompt in case user dismissed it */
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <button
              onClick={openMobileModal}
              className="flex items-center gap-3 w-full max-w-sm h-12 px-5 rounded-full bg-muted hover:bg-muted/80 transition-colors text-muted-foreground text-sm border"
            >
              <Search className="h-4 w-4 flex-shrink-0" />
              <span>Search videos, scholars, channels…</span>
            </button>
          </div>
        ) : (
          <div className="px-3 py-4">
            {/* Result count + reopen modal button */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Searching…" : (
                  <>
                    <span className="font-semibold text-foreground">{results.length}</span>
                    {` result${results.length !== 1 ? "s" : ""}${initialQuery ? ` for "${initialQuery}"` : ""}`}
                  </>
                )}
              </p>
              <button
                onClick={openMobileModal}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition-colors",
                  activeFilterCount > 0
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-foreground border-border hover:bg-muted"
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Search</span>
              </button>
            </div>

            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <VideoSkeleton key={i} />)}</div>
            ) : results.length > 0 ? (
              <ResultList results={results} onShare={handleShare} onPlaylist={handlePlaylist} onWatchLaterToggle={handleWatchLaterToggle} isInWatchLater={isInWatchLater} isMobile={isMobile} />
            ) : (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No results found</h3>
                <p className="text-muted-foreground text-sm">Try different keywords or adjust filters</p>
                <Button variant="outline" className="mt-4 rounded-full" onClick={openMobileModal}>
                  Modify search
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <ShareModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} videoUrl={shareUrl} />
      {selectedVideo && (
        <AddToPlaylistDialog
          video={{ id: selectedVideo.id, title: selectedVideo.title, channel: selectedVideo.channel }}
          open={showPlaylistDialog}
          onOpenChange={(o) => { setShowPlaylistDialog(o); if (!o) setSelectedVideo(null); }}
        />
      )}
    </div>
  );
}

// useSearchParams() needs a Suspense boundary so the page can be prerendered
export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageContent />
    </Suspense>
  );
}

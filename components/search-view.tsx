// components/search-view.tsx
// The search page. /search shows the results; /search/<title>/<id> the video opened from them, with the page and player of
// /videos. Both routes render this view and the address says which: opening a result only changes the address
// (history.pushState, which Next.js follows), so it's there at once, with no request, also in dev. As a scholar's About page.
"use client";

import { Suspense, useLayoutEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import { MultiSelect } from "@/components/multi-select";
import { DurationBadge } from "@/components/duration-badge";
import { RowMeta } from "@/components/media-details";
import { EmptyState } from "@/components/empty-state";
import { HiddenMedia, MediaMenu, useNotInterested } from "@/components/media-menu";
import { BIG_ROW_DETAILS, BIG_ROW_TITLE, CHIP, CHIP_OFF, CHIP_ON, PAGE, ROW_THUMB } from "@/components/page-layout";
import { youtubeThumb } from "@/lib/media-lookup";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { WatchedBar } from "@/components/watched-bar";
import { cn } from "@/lib/utils";
import { videoData, VideoItem } from "@/lib/video-data";
import { channelData, ChannelItem, getChannelHref } from "@/lib/channel-data";
import { scholarData } from "@/lib/scholar-data";
import { SEARCH_LANGUAGES, getDefaultSearchLangs, isDefaultSearchLangs, parseSearchLangs } from "@/lib/search-languages";
import { WatchView } from "@/components/watch-view";
import { isVideoPath, searchVideoPath } from "@/lib/video-url";
import { warmYouTube } from "@/lib/warm-youtube";
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

// ── Searching ─────────────────────────────────────────────────────────────────

const channelIds = (names: string[], map: Map<string, string>) => names.map((n) => map.get(n)).filter((id): id is string => !!id);

function search(query: string, f: SearchFilters): VideoItem[] {
  const term = query.trim().toLowerCase();
  const scholars = channelIds(f.scholars, scholarNameToChannelId);
  const channels = channelIds(f.channels, channelNameToId);
  return videoData.filter(
    (v) =>
      (!term ||
        v.title.toLowerCase().includes(term) ||
        v.channel.toLowerCase().includes(term) ||
        v.description.toLowerCase().includes(term) ||
        // Most titles are in Bangla, so also match the English category ("quran", "dua", …)
        (v.category ?? "").toLowerCase().includes(term)) &&
      (!f.langs.length || f.langs.includes(v.language)) &&
      (!f.cats.length || f.cats.includes(v.category)) &&
      (!f.scholars.length || scholars.includes(v.channelId)) &&
      (!f.channels.length || channels.includes(v.channelId))
  );
}

// ── Results ───────────────────────────────────────────────────────────────────

function ResultRow({ video, search, onOpen }: { video: VideoItem; search: string; onOpen: (href: string) => void }) {
  const notInterested = useNotInterested();
  if (notInterested.hidden) return <HiddenMedia onUndo={notInterested.undo} className="h-[90px] rounded-lg md:h-[180px] md:rounded-xl" />;
  const href = searchVideoPath(video, search);
  const open = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    onOpen(href);
  };
  return (
    <div className="group flex gap-3 md:gap-4" onPointerEnter={warmYouTube} onTouchStart={warmYouTube}>
      {/* Rest the mouse on the thumbnail: the video plays in it, as on YouTube (mouse only) */}
      <InlinePreview videoId={video.videoId} title={video.title} className={cn(ROW_THUMB, "self-start rounded-lg sm:w-60 md:w-80 md:rounded-xl lg:w-[360px]")}>
        <Link href={href} prefetch={false} onNavigate={open} tabIndex={-1} aria-hidden="true" className="relative block aspect-video w-full overflow-hidden rounded-lg bg-muted md:rounded-xl">
          <Image
            src={youtubeThumb(video.videoId)}
            alt=""
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 768px) 320px, (min-width: 640px) 240px, 160px"
            className="object-cover"
          />
          <DurationBadge>{video.duration}</DurationBadge>
          <WatchedBar videoId={video.videoId} />
        </Link>
      </InlinePreview>
      <div className="flex min-w-0 flex-1 items-start gap-1">
        <div className="min-w-0 flex-1">
          <Link href={href} prefetch={false} onNavigate={open}>
            <h3 className={BIG_ROW_TITLE}>{video.title}</h3>
          </Link>
          {/* Phones: channel, then views, as in every list. From md up, as on YouTube: views, then the channel with its picture */}
          <RowMeta views={video.views} timeAgo={video.timeAgo} className={cn("mt-1 hidden md:block", BIG_ROW_DETAILS)} />
          <Link href={getChannelHref(video.channelId)} className="mt-1 flex w-fit max-w-full items-center gap-2 text-muted-foreground transition-colors hover:text-foreground md:my-3">
            <Avatar className="hidden h-6 w-6 md:flex">
              <AvatarImage src={video.channelAvatar} alt="" />
              <AvatarFallback className="text-[11px]">{video.channel.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="truncate text-[13px] leading-[18px] md:text-xs">{video.channel}</span>
          </Link>
          <RowMeta views={video.views} timeAgo={video.timeAgo} className={cn("md:hidden", BIG_ROW_DETAILS)} />
          {video.description && <p className="hidden text-xs leading-[18px] text-muted-foreground md:line-clamp-2">{video.description}</p>}
        </div>
        <div className="-mr-2 -mt-2 flex-shrink-0 md:-mt-1.5">
          <MediaMenu scope="suggested" media={video} onNotInterested={notInterested.hide} />
        </div>
      </div>
    </div>
  );
}

function ResultList({ results, search, onOpen }: { results: VideoItem[]; search: string; onOpen: (href: string) => void }) {
  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <h2 className="sr-only">Results</h2>
      {results.map((video) => (
        <ResultRow key={video.id} video={video} search={search} onOpen={onOpen} />
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function SearchPageContent({ onOpen }: { onOpen: (href: string) => void }) {
  const searchParams = useSearchParams();

  // The URL says what is searched (header search, the phone's search screen, hashtags, back and forward)
  const query = searchParams?.get("q") || "";
  const list = (name: string) => searchParams?.get(name)?.split(",").filter(Boolean) ?? [];
  const fromUrl = (): SearchFilters => ({ langs: parseSearchLangs(searchParams?.get("lang") ?? null), cats: list("cat"), scholars: list("scholar"), channels: list("ch") });

  // The filters start as the URL's; on desktop they can be changed here
  const [filters, setFilters] = useState<SearchFilters>(fromUrl);
  const urlKey = searchParams?.toString() ?? "";
  const [filtersOf, setFiltersOf] = useState(urlKey);
  if (filtersOf !== urlKey) {
    setFiltersOf(urlKey);
    setFilters(fromUrl());
  }
  const { langs, cats, scholars, channels } = filters;
  const change = (part: Partial<SearchFilters>) => setFilters((f) => ({ ...f, ...part }));

  const hasActiveFilters = cats.length > 0 || scholars.length > 0 || channels.length > 0;
  const filtersOn = hasActiveFilters || !isDefaultSearchLangs(langs);
  const toggleLang = (code: string) =>
    change({ langs: langs.includes(code) ? (langs.length > 1 ? langs.filter((l) => l !== code) : langs) : [...langs, code] });
  const resetFilters = () => setFilters({ langs: getDefaultSearchLangs(), cats: [], scholars: [], channels: [] });

  const hasSearched = !!query.trim() || hasActiveFilters;
  const results = useMemo(() => (hasSearched ? search(query, filters) : []), [hasSearched, query, filters]);

  const [showDesktopFilters, setShowDesktopFilters] = useState(false);

  const openMobileModal = () =>
    window.dispatchEvent(new CustomEvent("open-search-modal"));

  const count = (
    <>
      <span className="font-semibold text-foreground">{results.length}</span>
      {` result${results.length !== 1 ? "s" : ""}${query ? ` for "${query}"` : ""}`}
    </>
  );
  const filterButton = cn(CHIP, "h-10 rounded-full px-4 md:h-9 [&_svg]:h-4 [&_svg]:w-4");
  const found = results.length > 0 ? <ResultList results={results} search={urlKey ? `?${urlKey}` : ""} onOpen={onOpen} /> : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <h1 className="sr-only">{query ? `Search results for "${query}"` : "Search"}</h1>

      {/* ══════════════════════════════════════════════════════════
          DESKTOP — results + collapsible filter panel
      ══════════════════════════════════════════════════════════ */}
      <div className={cn(PAGE, "hidden max-w-5xl md:mx-auto md:block")}>
        {!hasSearched ? (
          <EmptyState icon={Search} title="Search for Islamic content" description="Use the search bar above to find videos, scholars, and channels" />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="min-w-0 text-sm leading-5 text-muted-foreground">{count}</p>
              <button
                type="button"
                aria-expanded={showDesktopFilters}
                onClick={() => setShowDesktopFilters((v) => !v)}
                className={cn(filterButton, showDesktopFilters || filtersOn ? CHIP_ON : CHIP_OFF)}
              >
                <SlidersHorizontal /> Filters
                <ChevronDown className={cn("transition-transform duration-200", showDesktopFilters && "rotate-180")} />
              </button>
            </div>

            {showDesktopFilters && (
              <div className="mb-6 space-y-5 rounded-2xl border p-5">
                <div>
                  <p className="mb-2 text-sm font-medium">Language</p>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((lang) => (
                      <button key={lang.code} type="button" aria-pressed={langs.includes(lang.code)} onClick={() => toggleLang(lang.code)} className={cn(CHIP, langs.includes(lang.code) ? CHIP_ON : CHIP_OFF)}>
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </div>
                <MultiSelect label="Categories" options={categoryOptions} selected={cats} onChange={(v) => change({ cats: v })} />
                <MultiSelect label="Scholars" options={scholarOptions} selected={scholars} onChange={(v) => change({ scholars: v })} />
                <MultiSelect label="Channels" options={channelOptions} selected={channels} onChange={(v) => change({ channels: v })} />
                {filtersOn && (
                  <div className="flex justify-end">
                    <Button variant="ghost" className="h-9" onClick={resetFilters}>Clear filters</Button>
                  </div>
                )}
              </div>
            )}

            {found ?? (
              <EmptyState icon={Search} title="No results found" description="Try different keywords or adjust your filters">
                {filtersOn && <Button variant="outline" onClick={resetFilters}>Clear filters</Button>}
              </EmptyState>
            )}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          MOBILE — what was searched at the top (a tap changes it), and the results
      ══════════════════════════════════════════════════════════ */}
      <div className={cn(PAGE, "md:hidden")}>
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={openMobileModal}
            aria-label={query ? `Change the search: ${query}` : "Search videos, scholars, channels"}
            className={cn("flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-muted pl-3 pr-4 text-left text-base transition-colors active:bg-accent", !query && "text-muted-foreground")}
          >
            <Search className="h-5 w-5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{query || "Search videos, scholars, channels"}</span>
          </button>
          {hasSearched && (
            <button type="button" onClick={openMobileModal} className={cn(filterButton, filtersOn ? CHIP_ON : CHIP_OFF)}>
              <SlidersHorizontal /> Filters
            </button>
          )}
        </div>
        {hasSearched && (
          <>
            <p className="mb-3 text-sm leading-5 text-muted-foreground">{count}</p>
            {found ?? (
              <EmptyState icon={Search} title="No results found" description="Try different keywords or adjust your filters">
                <Button variant="outline" onClick={openMobileModal}>Change search</Button>
              </EmptyState>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Where the results were left, for Back, also from a related video's page (a new search starts at the top)
let left: { search: string; y: number } | null = null;

/** The search page: its results, or the video opened from them. */
export function SearchView() {
  const pathname = usePathname();
  const inVideo = isVideoPath(pathname);

  const openVideo = (href: string) => {
    left = { search: window.location.search, y: window.scrollY };
    // No request: the page is here already, so it opens at once (Next.js follows the address: usePathname)
    window.history.pushState(null, "", href);
  };
  useLayoutEffect(() => {
    if (inVideo) window.scrollTo(0, 0);
    else if (left?.search === window.location.search) window.scrollTo(0, left.y);
  }, [pathname, inVideo]);

  if (inVideo) return <WatchView inSearch />;
  // useSearchParams() needs a Suspense boundary so the page can be prerendered
  return (
    <Suspense fallback={null}>
      <SearchPageContent onOpen={openVideo} />
    </Suspense>
  );
}

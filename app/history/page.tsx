// app/history/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, History, Trash2, X } from "lucide-react";
import type { MenuAction } from "@/components/action-menu";
import { DurationBadge } from "@/components/duration-badge";
import { RowMeta } from "@/components/media-details";
import { EmptyState } from "@/components/empty-state";
import { MediaMenu, type MenuMedia } from "@/components/media-menu";
import { BIG_ROW_DETAILS, BIG_ROW_TITLE, CHIP, CHIP_OFF, CHIP_ON, CHIP_ROW, PAGE, PAGE_TITLE, ROW_THUMB, SECTION_TITLE } from "@/components/page-layout";
import { SearchField } from "@/components/search-field";
import ShortCard from "@/components/short-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WatchedBar } from "@/components/watched-bar";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import type { HistoryItem } from "@/lib/history-data";
import { imagePriorityProps, priorityForIndex, type ImagePriority } from "@/lib/image-priority";
import { useHydrated } from "@/lib/local-store";
import { mediaPath, mediaThumb } from "@/lib/media-lookup";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

type Category = "all" | "shorts" | "videos";

function VideoSkeleton() {
  return (
    <div className="flex gap-3 py-2 md:gap-4">
      <Skeleton className={cn(ROW_THUMB, "aspect-video rounded-lg md:w-[246px] md:rounded-xl")} />
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <Skeleton className="h-4 w-full md:h-5" />
        <Skeleton className="h-4 w-2/3 md:h-5" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

const GROUPS = ["Today", "Yesterday", "This week", "This month", "Older"] as const;
type Group = (typeof GROUPS)[number];

function groupOf(date: Date): Group {
  const now = new Date();
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(now) - day(date)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days <= 7) return "This week";
  if (days <= 30) return "This month";
  return "Older";
}

const asMedia = (v: HistoryItem): MenuMedia => ({ ...v, id: v.videoId || v.id, videoId: v.videoId || v.id, isShort: v.type === "short" });

/** `prioritize`: this row is at the top of the page, so its first thumbnails load first. */
function ShortsRow({ shorts, remove, prioritize = false }: { shorts: HistoryItem[]; remove: (v: HistoryItem) => MenuAction; prioritize?: boolean }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [arrows, setArrows] = useState({ left: false, right: false });

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const check = () => setArrows({ left: el.scrollLeft > 10, right: el.scrollLeft < el.scrollWidth - el.clientWidth - 10 });
    el.addEventListener("scroll", check);
    check();
    return () => el.removeEventListener("scroll", check);
  }, [shorts]);

  const scroll = (by: number) => scrollContainerRef.current?.scrollBy({ left: by, behavior: "smooth" });

  if (!shorts.length) return null;

  const arrow = "absolute top-[35%] z-10 hidden h-10 w-10 items-center justify-center rounded-full border bg-background shadow-md transition-colors hover:bg-accent md:flex";
  return (
    <div className="relative">
      {arrows.left && (
        <button type="button" aria-label="Scroll left" onClick={() => scroll(-400)} className={cn(arrow, "-left-5")}>
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {arrows.right && (
        <button type="button" aria-label="Scroll right" onClick={() => scroll(400)} className={cn(arrow, "-right-5")}>
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
      <div
        ref={scrollContainerRef}
        // Edge to edge on phones. No touch-action limit: a vertical swipe that starts on a short must still scroll the page
        className="-mx-3 flex gap-2 overflow-x-auto overscroll-x-contain px-3 pb-2 scrollbar-none md:mx-0 md:gap-3 md:px-0"
      >
        {shorts.map((short, index) => (
          <ShortCard
            key={short.id}
            className="w-[150px] flex-shrink-0 sm:w-[170px] lg:w-[190px]"
            scope="own"
            short={asMedia(short)}
            extra={[remove(short)]}
            imagePriority={prioritize ? priorityForIndex(index, 1) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { history: videos, removeFromHistory, replaceHistory } = useWatchHistory();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");


  const handleRemove = (item: HistoryItem) => {
    notify("Removed from History", { undo: removeFromHistory(item.id), thumb: mediaThumb(item.videoId || item.id) });
  };
  const removeAction = (item: HistoryItem): MenuAction => ({
    id: "remove",
    label: "Remove from History",
    icon: Trash2,
    danger: true,
    onSelect: () => handleRemove(item),
  });

  const handleClearAll = () => {
    const previous = videos;
    replaceHistory([]);
    notify("Watch history cleared", () => replaceHistory(previous));
  };

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return videos.filter(
      (v) =>
        (category === "all" || v.type === (category === "shorts" ? "short" : "video")) &&
        (!query || v.title.toLowerCase().includes(query) || v.channel.toLowerCase().includes(query))
    );
  }, [videos, searchQuery, category]);

  const groups = useMemo(
    () =>
      GROUPS.map((name) => {
        const items = filtered.filter((v) => groupOf(new Date(v.watchedDate)) === name);
        return { name, shorts: items.filter((v) => v.type === "short"), videos: items.filter((v) => v.type !== "short") };
      }).filter((g) => g.shorts.length || g.videos.length),
    [filtered]
  );

  const chips: { id: Category; label: string; count: number }[] = [
    { id: "all", label: "All", count: videos.length },
    { id: "videos", label: "Videos", count: videos.filter((v) => v.type !== "short").length },
    { id: "shorts", label: "Shorts", count: videos.filter((v) => v.type === "short").length },
  ];

  // YouTube's history row: a large thumbnail, the title (18px regular on desktop) and grey details. The whole text block
  // opens the video, channel name included
  const row = (video: HistoryItem, priority?: ImagePriority) => {
    const media = asMedia(video);
    const href = mediaPath(media);
    return (
      <div key={video.id} className="group flex w-full gap-3 py-1.5 md:gap-4 md:py-2">
        <Link href={href} tabIndex={-1} aria-hidden="true" className={cn(ROW_THUMB, "relative aspect-video self-start overflow-hidden rounded-lg bg-muted md:w-[246px] md:rounded-xl")}>
          <Image src={video.thumbnail} alt="" fill {...imagePriorityProps(priority)} className="object-cover" />
          <DurationBadge>{video.duration}</DurationBadge>
          <WatchedBar videoId={media.videoId} />
        </Link>
        <div className="flex min-w-0 flex-1 items-start gap-1">
          <Link href={href} className="min-w-0 flex-1">
            <h3 className={BIG_ROW_TITLE}>{video.title}</h3>
            <p className={cn("mt-1 truncate", BIG_ROW_DETAILS)}>{video.channel}</p>
            <RowMeta views={video.views} timeAgo={video.timeAgo} className={BIG_ROW_DETAILS} />
          </Link>
          <div className="-mr-2 -mt-2 flex flex-shrink-0 items-center md:-mt-1.5">
            {/* As on YouTube: on phones there is no ✕ ("Remove from History" is in the ⋮ menu); on desktop the ✕
                shows while the row is hovered or focused (always on touch screens, which can't hover) */}
            <button
              type="button"
              aria-label={`Remove "${video.title}" from history`}
              title="Remove from watch history"
              onClick={() => handleRemove(video)}
              className="hidden h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-accent can-hover:opacity-0 can-hover:group-hover:opacity-100 kb:group-focus-within:opacity-100 md:inline-flex"
            >
              <X className="h-6 w-6" />
            </button>
            <MediaMenu scope="own" media={media} extra={[removeAction(video)]} />
          </div>
        </div>
      </div>
    );
  };

  const search = (className?: string) => <SearchField value={searchQuery} onChange={setSearchQuery} label="Search watch history" className={className} />;

  return (
    <div className="min-h-screen bg-background">
      <div className={cn(PAGE, "pb-8")}>
        {!hydrated ? (
          <div className="max-w-[880px]">
            <Skeleton className="mb-4 h-8 w-48" />
            <div className="mb-4 flex gap-2">
              <Skeleton className="h-8 w-14 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <Skeleton className="mb-6 h-10 w-full max-w-md rounded-full lg:hidden" />
            <VideoSkeleton />
            <VideoSkeleton />
            <VideoSkeleton />
          </div>
        ) : videos.length === 0 ? (
          <EmptyState as="h1" icon={History} title="History is empty" description="Videos you watch will appear here">
            <Button onClick={() => router.push("/")}>Browse videos</Button>
          </EmptyState>
        ) : (
          <div className="lg:grid lg:grid-cols-[minmax(0,880px)_300px] lg:gap-12 xl:gap-16">
            <div className="min-w-0">
              <div className="mb-4 flex min-h-8 items-center justify-between gap-3">
                <h1 className={PAGE_TITLE}>Watch history</h1>
                <Button variant="ghost" className="-my-1 -mr-2 h-9 px-3 lg:hidden [&_svg]:size-5" onClick={handleClearAll}>
                  <Trash2 /> Clear all
                </Button>
              </div>

              <div className={cn(CHIP_ROW, "mb-4")}>
                {chips.map((c) => (
                  <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => setCategory(c.id)} className={cn(CHIP, category === c.id ? CHIP_ON : CHIP_OFF)}>
                    {c.label} <span className="font-normal opacity-70">{c.count}</span>
                  </button>
                ))}
              </div>

              {/* Search (phones and tablets; desktop has it in the side panel) */}
              {search("mb-5 max-w-md lg:hidden")}

              {filtered.length === 0 ? (
                <EmptyState icon={History} title={searchQuery ? "No results found" : `No ${category} in your history`} description={searchQuery ? "Try different keywords" : undefined} />
              ) : (
                <div className="space-y-8">
                  {groups.map((g, groupIndex) => (
                    <section key={g.name} aria-label={g.name}>
                      <h2 className={cn(SECTION_TITLE, "mb-3")}>{g.name}</h2>
                      <ShortsRow shorts={g.shorts} remove={removeAction} prioritize={groupIndex === 0} />
                      {g.videos.length > 0 && (
                        <div className={cn(g.shorts.length > 0 && "mt-4 md:mt-6")}>
                          {/* Top group without shorts: its first rows are the main images */}
                          {g.videos.map((v, i) => row(v, groupIndex === 0 && g.shorts.length === 0 ? priorityForIndex(i) : undefined))}
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop side panel: search and history controls, like YouTube */}
            <aside aria-label="Search and clear history" className="hidden lg:block">
              <div className="sticky top-[88px] space-y-4">
                {search()}
                <Button variant="ghost" className="h-10 w-full justify-start gap-3 px-3 [&_svg]:size-5" onClick={handleClearAll}>
                  <Trash2 /> Clear all watch history
                </Button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

// app/watch-later/page.tsx
"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Play,
  Shuffle,
  Trash2,
  BookmarkPlus,
  Share2,
  ChevronsUp,
  ChevronsDown,
  GripVertical,
  ArrowUpDown,
  Check,
} from "lucide-react";
import ShortCard from "@/components/short-card";
import { MoreButton } from "@/components/more-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWatchLater, WatchLaterVideo } from "@/hooks/useWatchLater";
import { useHydrated } from "@/lib/local-store";
import { AddToPlaylistDialog } from "@/components/add-to-playlist-dialog";

import { imagePriorityProps, priorityForIndex } from "@/lib/image-priority";
import { youtubeThumb } from "@/lib/media-lookup";
import { videoPath } from "@/lib/video-url";
type SortOption =
  | "manual"
  | "date-added-newest"
  | "date-added-oldest"
  | "most-popular"
  | "date-published-newest"
  | "date-published-oldest";

type FilterOption = "all" | "videos" | "shorts";

const SORT_LABELS: Record<SortOption, string> = {
  manual: "Manual",
  "date-added-newest": "Date added (newest)",
  "date-added-oldest": "Date added (oldest)",
  "most-popular": "Most popular",
  "date-published-newest": "Date published (newest)",
  "date-published-oldest": "Date published (oldest)",
};

const parseViews = (views: string): number => {
  const num = parseFloat(views.replace(/[^0-9.]/g, ""));
  if (views.includes("M")) return num * 1_000_000;
  if (views.includes("K")) return num * 1_000;
  return num;
};

const parseTimeAgo = (timeAgo: string): number => {
  const num = parseInt(timeAgo) || 1;
  if (timeAgo.includes("hour")) return num * 3_600;
  if (timeAgo.includes("day")) return num * 86_400;
  if (timeAgo.includes("week")) return num * 604_800;
  if (timeAgo.includes("month")) return num * 2_592_000;
  if (timeAgo.includes("year")) return num * 31_536_000;
  return 0;
};

const ytId = (v: WatchLaterVideo) => v.videoId ?? v.id;
const videoHref = (v: WatchLaterVideo) => videoPath({ title: v.title, videoId: ytId(v) });

export default function WatchLaterPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { videos: saved, setWatchLater, removeFromWatchLater } = useWatchLater();
  const videos = useMemo(() => saved.filter((v) => v.type !== "short"), [saved]);
  const shorts = useMemo(() => saved.filter((v) => v.type === "short"), [saved]);
  const setVideos = (next: WatchLaterVideo[]) => setWatchLater([...next, ...shorts]);
  const [playlistTarget, setPlaylistTarget] = useState<WatchLaterVideo | null>(null);

  const shareVideo = async (path: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [sortBy, setSortBy] = useState<SortOption>("manual");

  // Drag-and-drop (only active in manual sort)
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === dropIndex) {
      setDragOverIndex(null);
      return;
    }
    const next = [...videos];
    const [item] = next.splice(from, 1);
    next.splice(dropIndex, 0, item);
    setVideos(next);
    dragIndex.current = null;
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    setDragOverIndex(null);
  };

  // Move to top/bottom always switches to manual sort
  const moveToTop = (video: WatchLaterVideo) => {
    setVideos([video, ...videos.filter((v) => v.id !== video.id)]);
    setSortBy("manual");
  };

  const moveToBottom = (video: WatchLaterVideo) => {
    setVideos([...videos.filter((v) => v.id !== video.id), video]);
    setSortBy("manual");
  };

  const removeVideo = (id: string) => {
    removeFromWatchLater(id);
    toast.success("Removed from Watch Later");
  };

  const removeShort = removeVideo;

  const sortedVideos = useMemo(() => {
    if (sortBy === "manual") return videos;
    const copy = [...videos];
    switch (sortBy) {
      case "date-added-newest":
        return copy.sort((a, b) => b.addedAt - a.addedAt);
      case "date-added-oldest":
        return copy.sort((a, b) => a.addedAt - b.addedAt);
      case "most-popular":
        return copy.sort((a, b) => parseViews(b.views) - parseViews(a.views));
      case "date-published-newest":
        return copy.sort(
          (a, b) => parseTimeAgo(a.timeAgo) - parseTimeAgo(b.timeAgo)
        );
      case "date-published-oldest":
        return copy.sort(
          (a, b) => parseTimeAgo(b.timeAgo) - parseTimeAgo(a.timeAgo)
        );
    }
    return copy;
  }, [videos, sortBy]);

  const isDraggable = sortBy === "manual";
  const firstVideo = videos[0];
  // Cover: the first video (or the first short when only shorts are saved)
  const cover = firstVideo ?? shorts[0];
  const coverThumb = cover ? youtubeThumb(ytId(cover)) : null;
  const coverHref = firstVideo ? videoHref(firstVideo) : cover ? `/shorts?v=${ytId(cover)}` : "/";
  const playAll = () => {
    if (cover) router.push(coverHref);
  };
  const shufflePlay = () => {
    const r = videos[Math.floor(Math.random() * videos.length)];
    if (r) router.push(videoHref(r));
    else playAll();
  };

  const showVideos = activeFilter === "all" || activeFilter === "videos";
  const showShorts = activeFilter === "all" || activeFilter === "shorts";
  const isEmpty = videos.length === 0 && shorts.length === 0;

  return (
    <div className="min-h-screen bg-background mt-14 md:mt-16">
      <div className="px-3 pb-8 md:px-6 md:py-6">
        {!hydrated ? null : isEmpty ? (
          <div className="flex flex-col items-center px-6 py-20 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Clock className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="mb-2 text-xl font-bold">Watch Later is empty</h1>
            <p className="mb-5 text-sm text-muted-foreground">
              Save videos to watch them later
            </p>
            <Button className="rounded-full" onClick={() => router.push("/")}>
              Browse videos
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
            {/* ── Playlist panel: a hero on phones and tablets, a sticky side panel on desktop (YouTube layout) ── */}
            <div className="-mx-3 md:mx-0 lg:sticky lg:top-[88px] lg:h-[calc(100vh-112px)] lg:w-[340px] lg:flex-shrink-0 lg:self-start xl:w-[360px]">
              <div className="relative flex h-full flex-col overflow-hidden bg-neutral-800 text-white md:rounded-2xl">
                {/* Blurred cover behind the panel; white text stays readable in both themes */}
                {coverThumb && (
                  <>
                    <Image
                      src={coverThumb}
                      alt=""
                      fill
                      loading="eager" // same file as the cover below, so no extra download
                      className="scale-125 object-cover opacity-80 blur-2xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/55 to-black/85" />
                  </>
                )}

                <div className="relative z-10 flex flex-col p-4 md:flex-row md:items-end md:gap-6 md:p-6 lg:flex-col lg:items-stretch lg:gap-0">
                  {cover && coverThumb && (
                    <Link href={coverHref} className="group mb-4 block flex-shrink-0 md:mb-0 md:w-80 lg:mb-5 lg:w-full">
                      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/30">
                        <Image
                          src={coverThumb}
                          alt={cover.title}
                          fill
                          {...imagePriorityProps("lcp", { preload: false })}
                          className="object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <Play className="h-5 w-5 fill-white" /> Play all
                          </span>
                        </div>
                      </div>
                    </Link>
                  )}

                  <div className="min-w-0">
                    <Clock className="mb-2 h-6 w-6 opacity-80" />
                    <h1 className="text-2xl font-bold leading-8 md:text-[28px] md:leading-9">Watch Later</h1>
                    <p className="mt-2 text-[13px] leading-5 text-white/75">
                      {videos.length} videos · {shorts.length} shorts · Private
                    </p>

                    {/* Play all / Shuffle */}
                    <div className="mt-4 flex gap-2">
                      <Button
                        onClick={playAll}
                        className="h-10 flex-1 gap-2 rounded-full bg-white text-sm font-medium text-black hover:bg-white/85"
                      >
                        <Play className="h-5 w-5 fill-current" /> Play all
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={shufflePlay}
                        className="h-10 flex-1 gap-2 rounded-full bg-white/20 text-sm font-medium text-white hover:bg-white/30 hover:text-white"
                      >
                        <Shuffle className="h-5 w-5" /> Shuffle
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right column ── */}
            <div className="flex-1 min-w-0">
              {/* Sort + filter row */}
              <div className="mb-5 flex items-center gap-3 overflow-x-auto scrollbar-none">
                {/* Sort button */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="flex h-8 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-muted px-3 text-sm font-medium transition-colors hover:bg-accent">
                      <ArrowUpDown className="h-4 w-4" />
                      {sortBy === "manual" ? "Sort" : SORT_LABELS[sortBy]}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-60 rounded-xl p-1">
                    <div className="mb-1 border-b px-3 py-2">
                      <p className="text-sm font-medium text-muted-foreground">Sort by</p>
                    </div>
                    {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                      <DropdownMenuItem
                        key={option}
                        onClick={() => setSortBy(option)}
                        className="flex cursor-pointer items-center justify-between rounded-lg py-2 text-sm"
                      >
                        <span>{SORT_LABELS[option]}</span>
                        {sortBy === option && (
                          <Check className="h-5 w-5 flex-shrink-0" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Filter chips */}
                {(["all", "videos", "shorts"] as FilterOption[]).map((filter) => {
                  const count =
                    filter === "all"
                      ? videos.length + shorts.length
                      : filter === "videos"
                      ? videos.length
                      : shorts.length;
                  return (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={cn(
                        "h-8 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0",
                        activeFilter === filter
                          ? "bg-foreground text-background"
                          : "bg-muted hover:bg-accent text-foreground"
                      )}
                    >
                      {filter === "all"
                        ? "All"
                        : filter === "videos"
                        ? "Videos"
                        : "Shorts"}{" "}
                      <span className="font-normal opacity-70">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* ── Videos list ── */}
              {showVideos && sortedVideos.length > 0 && (
                <section className="mb-8">
                  {activeFilter === "all" && (
                    <h2 className="mb-3 text-lg font-bold md:text-xl">
                      Videos <span className="font-normal text-muted-foreground">— {sortedVideos.length}</span>
                    </h2>
                  )}
                  <div className="space-y-0.5">
                    {sortedVideos.map((video, index) => {
                      // Rows are small; the first row shares the side panel's (larger) image so it downloads once
                      const thumb = youtubeThumb(ytId(video), index === 0 ? "medium" : "small");
                      const isDragOver = dragOverIndex === index;
                      return (
                        <div
                          key={video.id}
                          className={cn(
                            "group flex items-center gap-2 rounded-xl py-1.5 transition-colors sm:gap-3 sm:pr-1",
                            isDragOver
                              ? "bg-primary/10 ring-1 ring-primary/30"
                              : "hover:bg-muted",
                            isDraggable && "cursor-grab active:cursor-grabbing"
                          )}
                          draggable={isDraggable}
                          onDragStart={() => isDraggable && handleDragStart(index)}
                          onDragOver={(e) => isDraggable && handleDragOver(e, index)}
                          onDrop={(e) => isDraggable && handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                        >
                          {/* Index / grip indicator */}
                          <div className="hidden w-7 flex-shrink-0 select-none items-center justify-center sm:flex">
                            {isDraggable ? (
                              <>
                                <span className="text-sm tabular-nums text-muted-foreground group-hover:hidden">
                                  {index + 1}
                                </span>
                                <GripVertical className="hidden h-5 w-5 text-muted-foreground group-hover:block" />
                              </>
                            ) : (
                              <span className="text-sm tabular-nums text-muted-foreground">
                                {index + 1}
                              </span>
                            )}
                          </div>

                          {/* Thumbnail */}
                          <Link
                            href={videoHref(video)}
                            className="relative aspect-video w-40 flex-shrink-0 overflow-hidden rounded-lg bg-muted"
                          >
                            <Image
                              src={thumb}
                              alt={video.title}
                              fill
                              {...imagePriorityProps(priorityForIndex(index), { preload: false })}
                              className="object-cover"
                            />
                            <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-px text-xs font-medium leading-4 text-white">
                              {video.duration}
                            </div>
                          </Link>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <Link href={videoHref(video)}>
                              <h3 className="line-clamp-2 break-words text-[15px] font-medium leading-5 md:text-base md:leading-[22px]">
                                {video.title}
                              </h3>
                            </Link>
                            <p className="mt-1 truncate text-[13px] leading-[18px] text-muted-foreground md:text-sm md:leading-5">
                              {video.channel}
                            </p>
                            <p className="text-[13px] leading-[18px] text-muted-foreground md:text-sm md:leading-5">
                              {video.views} · {video.timeAgo}
                            </p>
                          </div>

                          {/* Three-dot menu — always visible */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <MoreButton />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-60 rounded-xl py-2"
                            >
                              <DropdownMenuItem
                                onClick={() => setPlaylistTarget(video)}
                              >
                                <BookmarkPlus className="h-5 w-5" /> Save
                                to playlist
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => moveToTop(video)}
                              >
                                <ChevronsUp className="h-5 w-5" /> Move
                                to top
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => moveToBottom(video)}
                              >
                                <ChevronsDown className="h-5 w-5" /> Move
                                to bottom
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => shareVideo(videoHref(video))}
                              >
                                <Share2 className="h-5 w-5" /> Share
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 dark:text-red-400"
                                onClick={() => removeVideo(video.id)}
                              >
                                <Trash2 className="h-5 w-5" /> Remove
                                from Watch Later
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── Shorts grid ── */}
              {showShorts && shorts.length > 0 && (
                <section>
                  {activeFilter === "all" && (
                    <h2 className="mb-3 text-lg font-bold md:text-xl">
                      Shorts <span className="font-normal text-muted-foreground">— {shorts.length}</span>
                    </h2>
                  )}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 min-[1400px]:grid-cols-4">
                    {shorts.map((short) => {
                      const thumb = `https://img.youtube.com/vi/${ytId(short)}/hqdefault.jpg`;
                      return (
                        <ShortCard
                          key={short.id}
                          href={`/shorts?v=${ytId(short)}`}
                          title={short.title}
                          views={`${short.views} views`}
                          thumbnail={thumb}
                          menu={
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <MoreButton />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-60 rounded-xl py-2"
                              >
                                <DropdownMenuItem
                                  onClick={() => setPlaylistTarget(short)}
                                >
                                  <BookmarkPlus className="h-5 w-5" />{" "}
                                  Save to playlist
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => shareVideo(`/shorts?v=${ytId(short)}`)}
                                >
                                  <Share2 className="h-5 w-5" /> Share
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 dark:text-red-400"
                                  onClick={() => removeShort(short.id)}
                                >
                                  <Trash2 className="h-5 w-5" /> Remove
                                  from Watch Later
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          }
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Empty state for active filter */}
              {((activeFilter === "videos" && videos.length === 0) ||
                (activeFilter === "shorts" && shorts.length === 0)) && (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    No {activeFilter} saved yet
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {playlistTarget && (
        <AddToPlaylistDialog
          video={{ id: playlistTarget.id, title: playlistTarget.title, channel: playlistTarget.channel }}
          open
          onOpenChange={(o) => !o && setPlaylistTarget(null)}
        />
      )}
    </div>
  );
}

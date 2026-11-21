// app/history/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  History,
  Play,
  Trash2,
  Clock,
  Bookmark,
  Share,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { MoreButton } from "@/components/more-button";
import ShortCard from "@/components/short-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMediaQuery } from "@/hooks/use-media-query";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ShareModal } from "@/components/share-modal";
import { AddToPlaylistDialog } from "@/components/add-to-playlist-dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useWatchLater } from "@/hooks/useWatchLater";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { useHydrated } from "@/lib/local-store";


import type { HistoryItem } from "@/lib/history-data";
import { imagePriorityProps, priorityForIndex, type ImagePriority } from "@/lib/image-priority";
import { videoPath } from "@/lib/video-url";
const categories = [
  { id: "all", label: "All" },
  { id: "shorts", label: "Shorts" },
  { id: "videos", label: "Videos" },
];

function VideoSkeleton() {
  return (
    <div className="flex gap-3 py-2 md:gap-4">
      <Skeleton className="aspect-video w-40 flex-shrink-0 rounded-lg md:w-[246px] md:rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <Skeleton className="h-4 w-full md:h-5" />
        <Skeleton className="h-4 w-2/3 md:h-5" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

function getDateGroup(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const videoDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (videoDate.getTime() === today.getTime()) return "Today";
  if (videoDate.getTime() === yesterday.getTime()) return "Yesterday";
  if (videoDate >= weekAgo) return "This Week";
  if (videoDate >= monthAgo) return "This Month";
  return "Older";
}

/** `prioritize`: this row is at the top of the page, so its first thumbnails load first. */
function ShortsRow({ shorts, onShare, prioritize = false }: { shorts: HistoryItem[]; onShare: (short: HistoryItem) => void; prioritize?: boolean }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { addToWatchLater, isInWatchLater } = useWatchLater();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerShort, setDrawerShort] = useState<HistoryItem | null>(null);
  const [showShortPlaylistDialog, setShowShortPlaylistDialog] = useState(false);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 10);
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      checkScroll();
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, [shorts]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  if (!shorts.length) return null;

  return (
    <div className="relative group/shorts">
      {/* Arrow buttons - only visible on desktop (md and up) */}
      {!isMobile && showLeftArrow && (
        <button aria-label="Scroll left" onClick={() => scroll('left')} className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background shadow-md hidden md:flex items-center justify-center hover:bg-muted transition-colors border border-border">
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {!isMobile && showRightArrow && (
        <button aria-label="Scroll right" onClick={() => scroll('right')} className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background shadow-md hidden md:flex items-center justify-center hover:bg-muted transition-colors border border-border">
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Shorts Container - draggable on mobile */}
      <div
        ref={scrollContainerRef}
        // No touch-action limit: a vertical swipe that starts on a short must still scroll the page
        className="flex gap-2 overflow-x-auto overscroll-x-contain scrollbar-none pb-2 md:gap-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {shorts.map((short, index) => (
          <ShortCard
            key={short.id}
            className="w-[150px] flex-shrink-0 sm:w-[170px] lg:w-[190px]"
            href={`/shorts?v=${short.videoId}`}
            title={short.title}
            views={short.views}
            thumbnail={short.thumbnail}
            imagePriority={prioritize ? priorityForIndex(index, 1) : undefined}
            menu={isMobile ? (
              <MoreButton onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDrawerShort(short); setDrawerOpen(true); }} />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <MoreButton />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl">
                  <DropdownMenuItem className="cursor-pointer gap-3 py-2 text-sm" onClick={() => {
                    if (isInWatchLater(short.id)) {
                      toast.success("Already in Watch Later");
                    } else {
                      addToWatchLater({ id: short.id, title: short.title, channel: short.channel, channelAvatar: short.channelAvatar || "", thumbnail: short.thumbnail, views: short.views, timeAgo: short.timeAgo, duration: short.duration, addedAt: Date.now() });
                      toast.success("Added to Watch Later");
                    }
                  }}>
                    <Clock className="h-5 w-5" /> {isInWatchLater(short.id) ? "Saved to Watch Later" : "Save to Watch Later"}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer gap-3 py-2 text-sm" onSelect={(e) => { e.preventDefault(); setDrawerShort(short); setShowShortPlaylistDialog(true); }}>
                    <Bookmark className="h-5 w-5" /> Save to Playlist
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer gap-3 py-2 text-sm" onClick={() => onShare(short)}>
                    <Share className="h-5 w-5" /> Share
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        ))}
      </div>

      {/* Mobile Drawer - single instance outside map */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <div className="px-2 pt-2 pb-6">
            <button
              className="w-full flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-muted active:bg-accent transition-colors text-[15px] text-left"
              onClick={() => {
                if (drawerShort) {
                  if (isInWatchLater(drawerShort.id)) {
                    toast.success("Already in Watch Later");
                  } else {
                    addToWatchLater({ id: drawerShort.id, title: drawerShort.title, channel: drawerShort.channel, channelAvatar: drawerShort.channelAvatar || "", thumbnail: drawerShort.thumbnail, views: drawerShort.views, timeAgo: drawerShort.timeAgo, duration: drawerShort.duration, addedAt: Date.now() });
                    toast.success("Added to Watch Later");
                  }
                }
                setDrawerOpen(false);
              }}
            >
              <Clock className="h-5 w-5 flex-shrink-0" /> {drawerShort && isInWatchLater(drawerShort.id) ? "Saved to Watch Later" : "Save to Watch Later"}
            </button>
            <button
              className="w-full flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-muted active:bg-accent transition-colors text-[15px] text-left"
              onClick={() => { setShowShortPlaylistDialog(true); setDrawerOpen(false); }}
            >
              <Bookmark className="h-5 w-5 flex-shrink-0" /> Save to Playlist
            </button>
            <button
              className="w-full flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-muted active:bg-accent transition-colors text-[15px] text-left"
              onClick={() => { if (drawerShort) onShare(drawerShort); setDrawerOpen(false); }}
            >
              <Share className="h-5 w-5 flex-shrink-0" /> Share
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Add to Playlist Dialog for shorts */}
      {drawerShort && (
        <AddToPlaylistDialog
          video={{ id: drawerShort.id, title: drawerShort.title, channel: drawerShort.channel }}
          open={showShortPlaylistDialog}
          onOpenChange={setShowShortPlaylistDialog}
        />
      )}
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { addToWatchLater, isInWatchLater } = useWatchLater();
  const hydrated = useHydrated();
  const { history: videos, removeFromHistory, replaceHistory } = useWatchHistory();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [drawerVideo, setDrawerVideo] = useState<HistoryItem | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<HistoryItem | null>(null);
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = (videoId: string) => {
    removeFromHistory(videoId);
    toast.success("Removed from History");
  };

  const handleClearAll = () => {
    const previous = videos;
    replaceHistory([]);
    toast("Watch history cleared", {
      action: { label: "Undo", onClick: () => replaceHistory(previous) },
      duration: 6000,
    });
  };

  const filteredVideos = useMemo(() => {
    let list = videos.filter((v) =>
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.channel.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (activeCategory === "videos") list = list.filter((v) => v.type === "video");
    else if (activeCategory === "shorts") list = list.filter((v) => v.type === "short");

    list.sort((a, b) => {
      const dateA = a.watchedDate ? new Date(a.watchedDate).getTime() : 0;
      const dateB = b.watchedDate ? new Date(b.watchedDate).getTime() : 0;
      return dateB - dateA;
    });

    return list;
  }, [videos, searchQuery, activeCategory]);

  const groupedVideos = useMemo(() => {
    const groups: { [key: string]: { shorts: HistoryItem[]; videos: HistoryItem[] } } = {};
    ["Today", "Yesterday", "This Week", "This Month", "Older"].forEach(date => {
      groups[date] = { shorts: [], videos: [] };
    });

    filteredVideos.forEach((video) => {
      const group = video.watchedDate ? getDateGroup(new Date(video.watchedDate)) : "Older";
      if (!groups[group]) groups[group] = { shorts: [], videos: [] };
      if (video.type === "short") groups[group].shorts.push(video);
      else groups[group].videos.push(video);
    });

    Object.keys(groups).forEach(key => {
      if (groups[key].shorts.length === 0 && groups[key].videos.length === 0) delete groups[key];
    });

    return groups;
  }, [filteredVideos]);

  const handleShare = (video: HistoryItem) => {
    const url = video.type === "short"
      ? `${window.location.origin}/shorts?v=${video.videoId}`
      : `${window.location.origin}${videoPath({ title: video.title, videoId: video.videoId || video.id })}`;
    setShareUrl(url);
    setShareModalOpen(true);
  };

  const liveCategories = categories.map((cat) => ({
    ...cat,
    count: cat.id === "all" ? videos.length : cat.id === "shorts" ? videos.filter((v) => v.type === "short").length : videos.filter((v) => v.type === "video").length,
  }));

  const hrefFor = (video: HistoryItem) =>
    video.type === "short" ? `/shorts?v=${video.videoId}` : videoPath({ title: video.title, videoId: video.videoId || video.id });

  // YouTube's history row (measured on youtube.com / m.youtube.com): a large thumbnail, the title (18px regular
  // on desktop, 14px on phones) and grey 12px details. The whole text block opens the video, channel name included
  const renderVideoItem = (video: HistoryItem, priority?: ImagePriority) => (
    <div key={video.id} className="group flex w-full gap-3 py-2 md:gap-4">
      <Link href={hrefFor(video)} className="relative aspect-video w-40 flex-shrink-0 overflow-hidden rounded-lg bg-muted md:w-[246px] md:rounded-xl">
        <Image src={video.thumbnail} alt={video.title} fill {...imagePriorityProps(priority)} className="object-cover" />
        <div className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1 py-px text-xs font-medium leading-[18px] text-white">{video.duration}</div>
      </Link>
      <div className="flex min-w-0 flex-1 items-start gap-1">
        <Link href={hrefFor(video)} className="min-w-0 flex-1">
          <h3 className="line-clamp-2 break-words text-sm font-normal leading-5 text-foreground md:text-lg md:leading-[26px]">{video.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-[18px] text-muted-foreground">
            {video.channel}
            <span aria-hidden="true"> · </span>
            {video.views}
          </p>
          <p className="hidden text-xs leading-[18px] text-muted-foreground md:block">{video.timeAgo}</p>
        </Link>
        <div className="-mr-2 -mt-2 flex flex-shrink-0 items-center md:-mt-1.5">
          {/* As on YouTube: on phones there is no ✕ ("Remove from History" is in the ⋮ menu); on desktop the ✕
              shows while the row is hovered or focused (always on touch screens, which can't hover) */}
          <button
            type="button"
            aria-label={`Remove "${video.title}" from history`}
            title="Remove from watch history"
            onClick={() => handleRemove(video.id)}
            className="hidden h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-accent focus-visible:opacity-100 md:inline-flex can-hover:opacity-0 can-hover:group-hover:opacity-100 can-hover:group-focus-within:opacity-100"
          >
            <X className="h-6 w-6" />
          </button>
          {isMobile ? (
            <MoreButton onClick={() => { setDrawerVideo(video); setHistoryDrawerOpen(true); }} />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <MoreButton />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 rounded-xl py-2">
                <DropdownMenuItem onClick={() => router.push(hrefFor(video))} className="cursor-pointer gap-3 py-2 text-sm">
                  <Play className="h-5 w-5" /> Play now
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer gap-3 py-2 text-sm" onClick={() => {
                  if (isInWatchLater(video.id)) {
                    toast.success("Already in Watch Later");
                  } else {
                    addToWatchLater({ id: video.id, title: video.title, channel: video.channel, channelAvatar: video.channelAvatar || "", thumbnail: video.thumbnail, views: video.views, timeAgo: video.timeAgo, duration: video.duration, addedAt: Date.now() });
                    toast.success("Added to Watch Later");
                  }
                }}>
                  <Clock className="h-5 w-5" /> {isInWatchLater(video.id) ? "Saved to Watch Later" : "Save to Watch later"}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer gap-3 py-2 text-sm" onSelect={(e) => { e.preventDefault(); setSelectedVideo(video); setShowPlaylistDialog(true); }}>
                  <Bookmark className="h-5 w-5" /> Save to playlist
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer gap-3 py-2 text-sm" onClick={() => handleShare(video)}>
                  <Share className="h-5 w-5" /> Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRemove(video.id)} className="cursor-pointer gap-3 py-2 text-sm text-red-600 dark:text-red-400">
                  <Trash2 className="h-5 w-5" /> Remove from History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );

  const searchBox = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        aria-label="Search watch history"
        placeholder="Search watch history"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-10 w-full rounded-full border border-transparent bg-muted pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-input focus:bg-background"
      />
      {searchQuery && (
        <button type="button" aria-label="Clear search" onClick={() => setSearchQuery("")} className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mt-14 px-3 pb-8 pt-4 md:mt-16 md:px-6 md:pt-6">
        {isLoading || !hydrated ? (
          <div className="max-w-[880px]">
            <Skeleton className="mb-4 h-8 w-48" />
            <div className="mb-4 flex gap-3">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <Skeleton className="mb-6 h-10 w-full max-w-md rounded-full lg:hidden" />
            <VideoSkeleton />
            <VideoSkeleton />
            <VideoSkeleton />
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-20 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <History className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-xl font-bold">History is empty</h2>
            <p className="text-sm text-muted-foreground">Videos you watch will appear here</p>
            <Button className="mt-5 rounded-full" onClick={() => router.push("/")}>Browse videos</Button>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-[minmax(0,880px)_300px] lg:gap-12 xl:gap-16">
            <div className="min-w-0">
              {/* Header */}
              <div className="mb-4 flex items-center justify-between gap-3">
                <h1 className="text-xl font-bold md:text-2xl">Watch history</h1>
                <Button variant="ghost" className="h-9 gap-2 rounded-full px-3 text-sm font-medium lg:hidden" onClick={handleClearAll}>
                  <Trash2 className="h-5 w-5" /> Clear all
                </Button>
              </div>

              {/* Category chips */}
              <div className="mb-4 flex gap-3 overflow-x-auto scrollbar-none">
                {liveCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={activeCategory === cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "h-8 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors",
                      activeCategory === cat.id ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-accent"
                    )}
                  >
                    {cat.label} <span className="font-normal opacity-70">{cat.count}</span>
                  </button>
                ))}
              </div>

              {/* Search (phones and tablets; desktop has it in the side panel) */}
              <div className="mb-5 max-w-md lg:hidden">{searchBox}</div>

              {/* Content */}
              {filteredVideos.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">{searchQuery ? "No results found" : "No videos in this list"}</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedVideos).map(([dateGroup, { shorts, videos: dateVideos }], groupIndex) => (
                    <section key={dateGroup} aria-label={dateGroup}>
                      <h2 className="mb-3 text-lg font-bold md:mb-4 md:text-xl">{dateGroup}</h2>
                      <ShortsRow shorts={shorts} onShare={handleShare} prioritize={groupIndex === 0} />
                      {dateVideos.length > 0 && (
                        <div className={cn("space-y-1 md:space-y-2", shorts.length > 0 && "mt-4 md:mt-6")}>
                          {/* Top group without shorts: its first rows are the main images */}
                          {dateVideos.map((video, i) =>
                            renderVideoItem(video, groupIndex === 0 && shorts.length === 0 ? priorityForIndex(i) : undefined)
                          )}
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop side panel: search and history controls, like YouTube */}
            <aside className="hidden lg:block">
              <div className="sticky top-[88px] space-y-4 pt-1">
                {searchBox}
                <Button variant="ghost" className="h-10 w-full justify-start gap-3 rounded-full px-3 text-sm font-medium" onClick={handleClearAll}>
                  <Trash2 className="h-5 w-5" /> Clear all watch history
                </Button>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Mobile Drawer for video list items */}
      <Drawer open={historyDrawerOpen} onOpenChange={setHistoryDrawerOpen}>
        <DrawerContent>
          <div className="px-2 pt-2 pb-6">
            <button
              className="w-full flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-muted active:bg-accent transition-colors text-[15px] text-left"
              onClick={() => {
                if (drawerVideo) router.push(hrefFor(drawerVideo));
                setHistoryDrawerOpen(false);
              }}
            >
              <Play className="h-5 w-5 flex-shrink-0" /> Play now
            </button>
            <button
              className="w-full flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-muted active:bg-accent transition-colors text-[15px] text-left"
              onClick={() => {
                if (drawerVideo) {
                  if (isInWatchLater(drawerVideo.id)) {
                    toast.success("Already in Watch Later");
                  } else {
                    addToWatchLater({ id: drawerVideo.id, title: drawerVideo.title, channel: drawerVideo.channel, channelAvatar: drawerVideo.channelAvatar || "", thumbnail: drawerVideo.thumbnail, views: drawerVideo.views, timeAgo: drawerVideo.timeAgo, duration: drawerVideo.duration, addedAt: Date.now() });
                    toast.success("Added to Watch Later");
                  }
                }
                setHistoryDrawerOpen(false);
              }}
            >
              <Clock className="h-5 w-5 flex-shrink-0" /> {drawerVideo && isInWatchLater(drawerVideo.id) ? "Saved to Watch Later" : "Save to Watch Later"}
            </button>
            <button
              className="w-full flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-muted active:bg-accent transition-colors text-[15px] text-left"
              onClick={() => { if (drawerVideo) { setSelectedVideo(drawerVideo); setShowPlaylistDialog(true); } setHistoryDrawerOpen(false); }}
            >
              <Bookmark className="h-5 w-5 flex-shrink-0" /> Save to playlist
            </button>
            <button
              className="w-full flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-muted active:bg-accent transition-colors text-[15px] text-left"
              onClick={() => { if (drawerVideo) handleShare(drawerVideo); setHistoryDrawerOpen(false); }}
            >
              <Share className="h-5 w-5 flex-shrink-0" /> Share
            </button>
            <button
              className="w-full flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-muted active:bg-accent transition-colors text-[15px] text-left text-red-600 dark:text-red-400"
              onClick={() => { if (drawerVideo) handleRemove(drawerVideo.id); setHistoryDrawerOpen(false); }}
            >
              <Trash2 className="h-5 w-5 flex-shrink-0" /> Remove from History
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {selectedVideo && (
        <AddToPlaylistDialog
          video={{ id: selectedVideo.id, title: selectedVideo.title, channel: selectedVideo.channel }}
          open={showPlaylistDialog}
          onOpenChange={setShowPlaylistDialog}
        />
      )}

      <ShareModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} videoUrl={shareUrl} />
    </div>
  );
}
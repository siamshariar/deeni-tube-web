// components/related-videos.tsx
// The video page's related videos, as on YouTube (measured on Nov 23, 2026): chips that filter the list, and from
// 1016px wide rows of a thumbnail (62.5% of YouTube's side column) with a 14px title, 12px lines and, with a mouse, the
// row in its thumbnail's colour, the moving thumbnail and the three dots at the bottom right on hover. Between 768 and
// 1015px, where the list is under the player: two columns of cards. Phones: small rows.
"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, Flag, Play } from "lucide-react";
import { ChipBar, type Chip } from "@/components/chip-bar";
import { SaveIcon, ShareIcon } from "@/components/icons/action-icons";
import { MoreButton } from "@/components/more-button";
import { MovingThumbnail } from "@/components/moving-thumbnail";
import { WatchedBar } from "@/components/watched-bar";
import { RELATED_THUMB, WATCH_SECONDARY } from "@/components/watch-layout";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { getChannelHref } from "@/lib/channel-data";
import { youtubeThumb } from "@/lib/media-lookup";
import { openSaveCard } from "@/lib/save-card";
import { storyboardOf } from "@/lib/storyboard";
import { thumbTints } from "@/lib/thumb-tints";
import { daysAgo, shortAgo } from "@/lib/time-ago";
import type { VideoItem } from "@/lib/video-data";
import { videoPath } from "@/lib/video-url";
import { warmYouTube } from "@/lib/warm-youtube";
import { cn } from "@/lib/utils";

const MENU_ITEM = "flex items-center gap-4 px-4 py-2 text-sm cursor-pointer";
const MAX_TOPICS = 5;
const RECENT_DAYS = 31;

/** YouTube's chips for a video: All, its channel, Related (its category), other topics, the newest, the watched ones. */
function useRelatedChips(video: VideoItem, videos: VideoItem[]) {
  const { history } = useWatchHistory();
  return useMemo(() => {
    const lists: (Chip & { videos: VideoItem[] })[] = [{ id: "all", label: "All", videos }];
    const add = (id: string, label: string, list: VideoItem[]) => {
      if (list.length) lists.push({ id, label, videos: list });
    };
    add("channel", `From ${video.channel}`, videos.filter((v) => v.channelId === video.channelId));
    add("related", "Related", videos.filter((v) => v.category === video.category));
    const topics = new Map<string, VideoItem[]>();
    for (const v of videos) if (v.category !== video.category) topics.set(v.category, [...(topics.get(v.category) ?? []), v]);
    for (const [topic, list] of [...topics].filter(([, l]) => l.length > 1).sort((a, b) => b[1].length - a[1].length).slice(0, MAX_TOPICS))
      add(`topic:${topic}`, topic, list);
    add("recent", "Recently uploaded", videos.filter((v) => daysAgo(v.timeAgo) <= RECENT_DAYS).sort((a, b) => daysAgo(a.timeAgo) - daysAgo(b.timeAgo)));
    const watched = new Set(history.map((h) => h.videoId));
    add("watched", "Watched", videos.filter((v) => watched.has(v.videoId)));
    return lists;
  }, [video, videos, history]);
}

interface RelatedVideosProps {
  video: VideoItem;
  videos: VideoItem[];
  isMobile: boolean;
  isInWatchLater: (id: string) => boolean;
  onWatchLater: (video: VideoItem) => void;
  onShare: (video: VideoItem) => void;
  onReport: (video: VideoItem) => void;
  /** Phones: the three dots open the page's sheet */
  onMore: (video: VideoItem) => void;
}

export function RelatedVideos({ video, videos, isMobile, onMore, ...actions }: RelatedVideosProps) {
  const chips = useRelatedChips(video, videos);
  const [chipId, setChipId] = useState("all");
  const listRef = useRef<HTMLDivElement>(null);
  const chip = chips.find((c) => c.id === chipId) ?? chips[0];

  const bar = (className: string) => (
    <ChipBar
      chips={chips}
      selected={chip.id}
      onSelect={(id) => {
        setChipId(id);
        listRef.current?.scrollTo({ top: 0 });
      }}
      label="Filter related videos"
      className={className}
    />
  );

  if (isMobile)
    return (
      <section className="mt-6" aria-labelledby="related-heading-mobile">
        <h2 id="related-heading-mobile" className="sr-only">Related videos</h2>
        {/* Edge to edge: the chips run off the screen while they're swiped */}
        {bar("mb-3 [&>[role=group]]:px-3")}
        <div className="space-y-3 px-3">
          {chip.videos.map((v) => (
            <div key={v.id} className="flex gap-3">
              <Link href={videoPath(v)} className="relative aspect-video w-40 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                {/* Lazy on purpose: preloading the first one measured worse (it competes with the YouTube player) */}
                <Image src={youtubeThumb(v.videoId, "small")} alt={v.title} fill className="object-cover" />
                <Duration video={v} />
                <WatchedBar videoId={v.videoId} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={videoPath(v)} className="block">
                  <h3 className="line-clamp-2 text-[15px] font-medium leading-5 [overflow-wrap:anywhere]">{v.title}</h3>
                </Link>
                <p className="mt-1 truncate text-[13px] leading-[18px] text-muted-foreground">{v.channel}</p>
                <p className="truncate text-[13px] leading-[18px] text-muted-foreground">{v.views} • {v.timeAgo}</p>
              </div>
              <MoreButton onClick={(e) => { e.stopPropagation(); onMore(v); }} className="-mr-2 -mt-1.5" />
            </div>
          ))}
        </div>
      </section>
    );

  return (
    <aside
      className={cn(WATCH_SECONDARY, "min-[1016px]:sticky min-[1016px]:top-[68px] min-[1016px]:flex min-[1016px]:max-h-[calc(100vh-92px)] min-[1016px]:flex-col min-[1016px]:self-start")}
      aria-labelledby="related-heading"
    >
      <h2 id="related-heading" className="sr-only">Related videos</h2>
      {bar("mb-2 flex-shrink-0")}
      {/* Beside the player (from 1016px) the list stays in view and scrolls on its own, with the thin scrollbar, so the
          page itself only scrolls as far as the description. (Room on every side for a hovered row's colour.) */}
      <div
        ref={listRef}
        tabIndex={0}
        aria-label="Related videos list"
        className="yt-scrollbar grid grid-cols-2 gap-x-4 gap-y-6 focus-visible:outline-none min-[1016px]:-mx-2 min-[1016px]:-mt-1.5 min-[1016px]:flex min-[1016px]:min-h-0 min-[1016px]:flex-1 min-[1016px]:flex-col min-[1016px]:gap-2 min-[1016px]:overflow-y-auto min-[1016px]:overflow-x-hidden min-[1016px]:overscroll-contain min-[1016px]:px-2 min-[1016px]:pb-1.5 min-[1016px]:pt-1.5"
      >
        {chip.videos.map((v) => (
          <RelatedCard key={v.id} video={v} {...actions} />
        ))}
      </div>
    </aside>
  );
}

const Duration = ({ video }: { video: VideoItem }) => (
  <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-px text-xs font-medium leading-[18px] text-white">{video.duration}</span>
);

function RelatedCard({ video: v, isInWatchLater, onWatchLater, onShare, onReport }: { video: VideoItem } & Omit<RelatedVideosProps, "video" | "videos" | "isMobile" | "onMore">) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="group/rel relative isolate flex flex-shrink-0 flex-col min-[1016px]:flex-row"
      onPointerEnter={(e) => {
        warmYouTube();
        if (e.pointerType !== "mouse") return;
        setHovered(true);
        void storyboardOf(v.videoId); // the moving thumbnail's data, loaded once
      }}
      onPointerLeave={() => setHovered(false)}
    >
      {/* The thumbnail's colour behind the row, 6px out on each side */}
      <div
        aria-hidden="true"
        data-tint
        style={{ "--tint": `${thumbTints[v.videoId] ?? "0 0%"} 53%` } as React.CSSProperties}
        className="pointer-events-none absolute -inset-1.5 -z-10 rounded-lg bg-[hsl(var(--tint)/0.13)] opacity-0 transition-opacity duration-300 can-hover:group-hover/rel:opacity-100 dark:bg-[hsl(var(--tint)/0.17)]"
      />
      <Link
        href={videoPath(v)}
        tabIndex={-1} // the title is the same link
        className={cn("relative aspect-video w-full flex-shrink-0 self-start overflow-hidden rounded-lg bg-muted", RELATED_THUMB)}
      >
        <Image src={youtubeThumb(v.videoId)} alt={v.title} fill className="object-cover" />
        <Duration video={v} />
        <WatchedBar videoId={v.videoId} />
        <MovingThumbnail videoId={v.videoId} active={hovered} />
      </Link>
      {/* The whole text side opens the video (the title's link covers it), except the channel and the three dots */}
      <div className="relative min-w-0 flex-1 pt-2 min-[1016px]:pl-3 min-[1016px]:pt-0">
        <Link href={videoPath(v)} className="block pr-8 after:absolute after:inset-0 after:content-[''] min-[1016px]:pr-0">
          <h3 className="line-clamp-2 text-sm font-medium leading-5 [overflow-wrap:anywhere] min-[1200px]:line-clamp-3">{v.title}</h3>
        </Link>
        <Link href={getChannelHref(v.channelId)} className="relative z-[1] mt-0.5 block w-fit max-w-full truncate text-xs leading-[18px] text-muted-foreground hover:text-foreground">{v.channel}</Link>
        <p className="mt-0.5 flex gap-2 truncate text-xs leading-[18px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Play className="h-3 w-3" aria-hidden="true" />
            <span aria-hidden="true">{v.views.replace(/ views?$/, "")}</span>
            <span className="sr-only">{v.views}</span>
          </span>
          <span>{shortAgo(v.timeAgo)}</span>
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* As on YouTube: with a mouse only shown while the row is hovered or the menu is open (always shown on touch screens) */}
            <MoreButton
              size="sm"
              onClick={(e) => e.stopPropagation()}
              className="absolute -right-2 top-0.5 z-[1] transition-opacity duration-200 can-hover:opacity-0 can-hover:group-hover/rel:opacity-100 kb:group-focus-within/rel:opacity-100 data-[state=open]:opacity-100 min-[1016px]:bottom-0 min-[1016px]:right-0 min-[1016px]:top-auto"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-xl py-2">
            <DropdownMenuItem className={MENU_ITEM} onSelect={() => onWatchLater(v)}><Clock className="h-5 w-5" /> {isInWatchLater(v.id) ? "Remove from Watch later" : "Save to Watch later"}</DropdownMenuItem>
            <DropdownMenuItem className={MENU_ITEM} afterClose={() => openSaveCard(v)}><SaveIcon className="h-5 w-5" /> Save to playlist</DropdownMenuItem>
            <DropdownMenuItem className={MENU_ITEM} onSelect={() => onShare(v)}><ShareIcon className="h-5 w-5" /> Share</DropdownMenuItem>
            <DropdownMenuItem className={MENU_ITEM} afterClose={() => onReport(v)}><Flag className="h-5 w-5" /> Report</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

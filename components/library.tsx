// components/library.tsx
// What Watch later and Liked videos are made of, so the two look and work the same: the panel with the cover and the
// Play all / Shuffle buttons (a hero on phones and tablets, a sticky side panel on desktop: YouTube's layout), the
// filter chips, the rows and the Shorts grid.
"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { GripVertical, Play, Shuffle, type LucideIcon } from "lucide-react";
import { DurationBadge } from "@/components/duration-badge";
import { Dots, RowMeta } from "@/components/media-details";
import { MediaMenu, type MenuMedia } from "@/components/media-menu";
import { CHIP, CHIP_OFF, CHIP_ON, CHIP_ROW, ROW_DETAILS, ROW_THUMB, ROW_TITLE, SECTION_TITLE } from "@/components/page-layout";
import ShortCard from "@/components/short-card";
import type { MenuAction } from "@/components/action-menu";
import { Button } from "@/components/ui/button";
import { WatchedBar } from "@/components/watched-bar";
import type { SavedVideo } from "@/hooks/useSavedList";
import { countText } from "@/lib/format";
import { imagePriorityProps, priorityForIndex } from "@/lib/image-priority";
import { mediaPath, youtubeThumb } from "@/lib/media-lookup";
import { cn } from "@/lib/utils";

export type LibraryFilter = "all" | "videos" | "shorts";

/** A saved item as the menus and links need it */
export const asMedia = (v: SavedVideo): MenuMedia => ({ ...v, videoId: v.videoId ?? v.id, isShort: v.type === "short" });
export const savedHref = (v: SavedVideo) => mediaPath(asMedia(v));

interface LibraryPageProps {
  icon: LucideIcon;
  title: string;
  videos: SavedVideo[];
  shorts: SavedVideo[];
  onPlayAll: () => void;
  onShuffle: () => void;
  children: ReactNode;
}

export function LibraryPage({ icon: Icon, title, videos, shorts, onPlayAll, onShuffle, children }: LibraryPageProps) {
  // Cover: the first video (or the first short when only shorts are saved)
  const cover = videos[0] ?? shorts[0];
  const coverThumb = cover && youtubeThumb(cover.videoId ?? cover.id);
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
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
              <Link href={savedHref(cover)} className="group mb-4 block flex-shrink-0 md:mb-0 md:w-[45%] md:max-w-80 lg:mb-5 lg:w-full lg:max-w-none">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/30">
                  <Image src={coverThumb} alt={cover.title} fill {...imagePriorityProps("lcp", { preload: false })} className="object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Play className="h-5 w-5 fill-white" /> Play all
                    </span>
                  </div>
                </div>
              </Link>
            )}
            <div className="min-w-0 flex-1">
              <Icon className="mb-2 h-6 w-6 opacity-80" aria-hidden="true" />
              <h1 className="text-2xl font-bold leading-8 md:text-[28px] md:leading-9">{title}</h1>
              <Dots className="mt-2 text-[13px] leading-5 text-white/75">
                {countText(videos.length, "video")}
                {countText(shorts.length, "short")}
                {"Private"}
              </Dots>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={onPlayAll} className="h-10 min-w-[120px] flex-1 bg-white text-black hover:bg-white/85 [&_svg]:size-5">
                  <Play className="fill-current" /> Play all
                </Button>
                <Button variant="ghost" onClick={onShuffle} className="h-10 min-w-[120px] flex-1 bg-white/20 text-white hover:bg-white/30 hover:text-white active:bg-white/30 [&_svg]:size-5">
                  <Shuffle /> Shuffle
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** All · Videos · Shorts, with how many of each; `before` goes first in the row (a sort chip) */
export function LibraryChips({ videos, shorts, value, onChange, before }: { videos: number; shorts: number; value: LibraryFilter; onChange: (f: LibraryFilter) => void; before?: ReactNode }) {
  const chips = [
    { id: "all", label: "All", count: videos + shorts },
    { id: "videos", label: "Videos", count: videos },
    { id: "shorts", label: "Shorts", count: shorts },
  ] as const;
  return (
    <div className={cn(CHIP_ROW, "mb-5")}>
      {before}
      {chips.map((c) => (
        <button key={c.id} type="button" aria-pressed={value === c.id} onClick={() => onChange(c.id)} className={cn(CHIP, value === c.id ? CHIP_ON : CHIP_OFF)}>
          {c.label} <span className="font-normal opacity-70">{c.count}</span>
        </button>
      ))}
    </div>
  );
}

export function LibraryTitle({ children, count }: { children: string; count: number }) {
  return (
    <h2 className={cn(SECTION_TITLE, "mb-3")}>
      {children} <span className="font-normal text-muted-foreground">— {count}</span>
    </h2>
  );
}

interface LibraryRowProps {
  video: SavedVideo;
  index: number;
  extra: MenuAction[];
  inWatchLater?: boolean;
  /** It can be dragged to another place */
  draggable?: boolean;
  dragOver?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

export function LibraryRow({ video, index, extra, inWatchLater, draggable = false, dragOver = false, ...drag }: LibraryRowProps) {
  const media = asMedia(video);
  const href = mediaPath(media);
  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded-xl py-1.5 transition-colors sm:items-center sm:gap-3 sm:pr-1",
        dragOver ? "bg-primary/10 ring-1 ring-primary/30" : "can-hover:hover:bg-muted",
        draggable && "cursor-grab active:cursor-grabbing"
      )}
      draggable={draggable}
      {...(draggable ? drag : {})}
    >
      <div className="hidden w-7 flex-shrink-0 select-none items-center justify-center sm:flex">
        <span className={cn("text-sm tabular-nums text-muted-foreground", draggable && "can-hover:group-hover:hidden")}>{index + 1}</span>
        {draggable && <GripVertical className="hidden h-5 w-5 text-muted-foreground can-hover:group-hover:block" aria-hidden="true" />}
      </div>
      <Link href={href} tabIndex={-1} aria-hidden="true" className={cn(ROW_THUMB, "relative aspect-video overflow-hidden rounded-lg bg-muted")}>
        {/* Rows are small; the first row shares the panel's (larger) image so it downloads once */}
        <Image src={youtubeThumb(media.videoId, index === 0 ? "medium" : "small")} alt="" fill {...imagePriorityProps(priorityForIndex(index), { preload: false })} className="object-cover" />
        <DurationBadge>{video.duration}</DurationBadge>
        <WatchedBar videoId={media.videoId} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={href}>
          <h3 className={ROW_TITLE}>{video.title}</h3>
        </Link>
        <p className={cn("mt-1 truncate", ROW_DETAILS)}>{video.channel}</p>
        <RowMeta views={video.views} timeAgo={video.timeAgo} className={ROW_DETAILS} />
      </div>
      <div className="-mr-2 -mt-2 flex-shrink-0 sm:mr-0 sm:mt-0">
        <MediaMenu scope="own" media={media} extra={extra} inWatchLater={inWatchLater} />
      </div>
    </div>
  );
}

export function LibraryShorts({ shorts, extra, inWatchLater }: { shorts: SavedVideo[]; extra: (short: SavedVideo) => MenuAction[]; inWatchLater?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-3 md:gap-x-4 lg:grid-cols-2 xl:grid-cols-3 min-[1400px]:grid-cols-4">
      {shorts.map((s) => (
        <ShortCard key={s.id} scope="own" short={asMedia(s)} extra={extra(s)} inWatchLater={inWatchLater} />
      ))}
    </div>
  );
}

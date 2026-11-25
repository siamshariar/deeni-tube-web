// components/playlist-card.tsx
// The one playlist card (playlists page, channel and scholar pages): a row on phones, a card from sm up, with the
// "stack" edge, up to four covers and the number of videos. The whole card is a link; its menu is beside it, not in it.
"use client";

import { HoverTint } from "@/components/hover-tint";
import Image from "next/image";
import Link from "next/link";
import { Globe, ListVideo, Lock } from "lucide-react";
import { PlaylistMenu } from "@/components/playlist-menu";
import { imagePriorityProps, type ImagePriority } from "@/lib/image-priority";
import { findPlayable, youtubeThumb } from "@/lib/media-lookup";
import { playPlaylistFromTap } from "@/lib/play-playlist";
import type { PlaylistItem } from "@/lib/playlist-data";
import { countText } from "@/lib/format";
import { ROW_THUMB } from "@/components/page-layout";
import { cn } from "@/lib/utils";

interface PlaylistCardProps {
  playlist: PlaylistItem;
  /** Listed on a channel's or scholar's page: read-only, and it opens as the channel's */
  ofChannel?: boolean;
  imagePriority?: ImagePriority;
}

/** Columns of playlist cards, the same everywhere */
export const PLAYLIST_GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-8 lg:grid-cols-3 xl:grid-cols-4";

export function PlaylistCard({ playlist, ofChannel = false, imagePriority }: PlaylistCardProps) {
  const href = `/playlists/${playlist.slug}/${playlist.id}${ofChannel ? "?source=channel" : ""}`;
  const covers = playlist.videoIds.slice(0, 4).map((id) => findPlayable(id)?.videoId).filter((id): id is string => !!id);
  const count = playlist.videoIds.length;
  const play = () => playPlaylistFromTap(playlist.videoIds);
  return (
    <div className="group group/tint relative isolate flex gap-3 sm:flex-col sm:gap-0">
      {covers[0] && <HoverTint videoId={covers[0]} className="-inset-2 rounded-lg sm:-inset-3 sm:rounded-2xl" />}
      <div className={cn(ROW_THUMB, "relative pt-1.5 sm:w-full sm:pt-2")}>
        <div
          aria-hidden="true"
          className="absolute inset-x-2 top-0 h-1 rounded-t-md bg-muted-foreground/40 sm:inset-x-3 sm:h-1.5 sm:rounded-t-lg"
          style={playlist.thumbnailColor ? { backgroundColor: playlist.thumbnailColor, opacity: 0.55 } : undefined}
        />
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted sm:rounded-xl">
          {covers.length >= 2 ? (
            <div className="grid h-full w-full grid-cols-2 gap-0.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="relative overflow-hidden bg-muted">
                  {covers[i] ? (
                    <Image src={youtubeThumb(covers[i], "small")} alt="" fill {...imagePriorityProps(i === 0 ? imagePriority : undefined)} className="object-cover" />
                  ) : (
                    <div className="absolute inset-0" style={{ backgroundColor: playlist.thumbnailColor, opacity: 0.4 }} />
                  )}
                </div>
              ))}
            </div>
          ) : covers.length === 1 ? (
            <Image src={youtubeThumb(covers[0])} alt="" fill {...imagePriorityProps(imagePriority)} className="object-cover" />
          ) : (
            <>
              <div className="absolute inset-0 opacity-30" style={{ backgroundColor: playlist.thumbnailColor }} />
              <div className="absolute inset-4 flex items-center justify-center rounded-lg" style={{ backgroundColor: playlist.thumbnailColor }}>
                <ListVideo className="h-10 w-10 text-white/60" />
              </div>
            </>
          )}
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded bg-black/80 px-1.5 py-px text-xs font-medium leading-[18px] text-white">
            <ListVideo className="h-4 w-4" aria-hidden="true" />
            <span className="sm:hidden">{count}</span>
            <span className="hidden sm:inline">{countText(count, "video")}</span>
          </div>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-start gap-1 pt-1.5 sm:pt-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[15px] font-medium leading-5 [overflow-wrap:anywhere] md:text-base md:leading-[22px]">
            {/* The link covers the whole card */}
            <Link
              href={href}
              onClick={play}
              className="after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-2"
            >
              {playlist.name}
            </Link>
          </h3>
          <p className="mt-1 flex items-center gap-1 text-[13px] leading-[18px] text-muted-foreground md:text-sm md:leading-5">
            {playlist.isPublic ? <Globe className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />}
            <span className="truncate">
              {playlist.isPublic ? "Public" : "Private"}<span className="max-[399px]:hidden"> <span aria-hidden="true">•</span> Playlist</span>
            </span>
          </p>
          <p className="truncate text-[13px] font-medium leading-[18px] text-muted-foreground md:text-sm md:leading-5">View full playlist</p>
        </div>
        <div className="relative z-[1] -mr-2 -mt-2 flex-shrink-0">
          <PlaylistMenu playlist={playlist} readOnly={ofChannel} playHref={href} onPlay={play} />
        </div>
      </div>
    </div>
  );
}

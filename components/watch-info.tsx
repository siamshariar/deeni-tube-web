// components/watch-info.tsx
// What is under the player on the video page and in a playlist: the title, the channel, the buttons (Share, Watch later,
// Save and the ⋯ menu) and the description. YouTube's watch page; one component, so the two pages can't differ.
"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Clock, EyeOff, Flag, MoreHorizontal, UserX } from "lucide-react";
import { ActionMenu } from "@/components/action-menu";
import { DescriptionText } from "@/components/description-text";
import { SaveIcon, ShareIcon } from "@/components/icons/action-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Drawer, DrawerContent, DrawerTitleBar } from "@/components/ui/drawer";
import { useBack } from "@/hooks/use-back";
import { useDontRecommend } from "@/hooks/useDontRecommend";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useHydrated } from "@/lib/local-store";
import { usePlaylists } from "@/hooks/usePlaylists";
import { savedItem } from "@/hooks/useSavedList";
import { useWatchLater } from "@/hooks/useWatchLater";
import { getChannelHref, subscribersText } from "@/lib/channel-data";
import { openReport, openShare } from "@/lib/dialogs";
import { mediaPath, youtubeThumb } from "@/lib/media-lookup";
import { notify } from "@/lib/notify";
import { openSaveCard } from "@/lib/save-card";
import type { VideoItem } from "@/lib/video-data";

// YouTube-style action pill (36px tall, 24px icon) and round icon button. A little smaller on phones under 400px, so the
// whole row shows without swiping it
const PILL =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-muted pl-3 pr-4 text-sm font-medium transition-colors hover:bg-accent active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:h-6 [&_svg]:w-6 max-[399px]:gap-1 max-[399px]:pl-2.5 max-[399px]:pr-3 max-[399px]:text-[13px] max-[399px]:[&_svg]:h-5 max-[399px]:[&_svg]:w-5";
const ROUND =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted transition-colors hover:bg-accent active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:h-6 [&_svg]:w-6";
const SHORT_TEXT = 150;

export function WatchInfo({ video, parent }: { video: VideoItem; parent: string | (() => string) }) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const hydrated = useHydrated();
  const back = useBack(parent);
  const dontRecommend = useDontRecommend();
  const { isSaved } = usePlaylists();
  const { toggleWatchLater, isInWatchLater } = useWatchLater();
  const [showAll, setShowAll] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const inWatchLater = isInWatchLater(video.id);
  const description = video.description ?? "";
  const long = description.length > SHORT_TEXT;

  return (
    <div className="mt-3">
      <h1 className="line-clamp-2 text-lg font-semibold leading-6 [overflow-wrap:anywhere] md:line-clamp-none md:text-xl md:font-bold md:leading-7">{video.title}</h1>

      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Link href={getChannelHref(video.channelId)} className="flex min-w-0 items-center gap-3 self-start md:self-auto">
          <Avatar className="h-9 w-9 flex-shrink-0 md:h-10 md:w-10">
            <AvatarImage src={video.channelAvatar} alt="" />
            <AvatarFallback className="font-medium">{video.channel.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium leading-5 md:text-base">{video.channel}</p>
            <p className="text-xs leading-[18px] text-muted-foreground">{subscribersText(video.channelId)}</p>
          </div>
        </Link>

        {/* Actions — a scrollable row of pills on phones */}
        <div className="-mx-3 flex items-center gap-2 overflow-x-auto px-3 scrollbar-none max-[399px]:gap-1.5 md:mx-0 md:overflow-visible md:px-0">
          <button type="button" className={PILL} onClick={() => openShare(mediaPath(video))}>
            <ShareIcon /> <span className="max-[339px]:sr-only">Share</span>
          </button>
          <button
            type="button"
            className={PILL}
            aria-pressed={inWatchLater}
            onClick={() =>
              toggleWatchLater(
                savedItem(video.id, 0) ?? {
                  ...video,
                  type: video.isShort ? "short" : "video",
                  thumbnail: youtubeThumb(video.videoId),
                }
              )
            }
          >
            {inWatchLater ? <><Check /> Saved</> : <><Clock /> Watch later</>}
          </button>
          <button type="button" className={PILL} onClick={(e) => openSaveCard(video, e.currentTarget)}>
            <SaveIcon filled={isSaved(video.id)} /> Save
          </button>
          <ActionMenu
            title="Video actions"
            actions={[
              {
                id: "not-interested",
                label: "Not interested",
                icon: EyeOff,
                onSelect: () => {
                  notify("Video removed");
                  setTimeout(back, 1000);
                },
              },
              { id: "dont-recommend", label: "Don't recommend channel", icon: UserX, onSelect: () => dontRecommend(video.channelId, video.channel) },
              { id: "report", label: "Report", icon: Flag, opens: true, onSelect: () => openReport(video.isShort ? "short" : "video", video.title) },
            ]}
            trigger={
              <button type="button" aria-label="More actions" className={ROUND}>
                <MoreHorizontal />
              </button>
            }
          />
        </div>
      </div>

      {/* Description – inline on desktop, a sheet on phones */}
      <div className="mt-3 rounded-xl bg-muted p-3 text-sm leading-5">
        <p className="font-medium">
          {video.views}
          <span className="ml-2">{video.timeAgo}</span>
        </p>
        {/* Both are in the server's page, shown by CSS, so phones don't first show the desktop's */}
        {(!hydrated || isMobile) && (
          <div className="md:hidden">
            <p className="mt-1 line-clamp-2 [overflow-wrap:anywhere]">{description}</p>
            <button type="button" onClick={() => setSheetOpen(true)} className="mt-1 font-medium">
              ...more
            </button>
          </div>
        )}
        {(!hydrated || !isMobile) && (
          <div className="hidden md:block">
            {showAll || !long ? (
              <>
                <DescriptionText text={description} className="mt-1" />
                {long && (
                  <button type="button" onClick={() => setShowAll(false)} className="mt-3 font-medium">
                    Show less
                  </button>
                )}
              </>
            ) : (
              <p className="mt-1 [overflow-wrap:anywhere]">
                {description.slice(0, SHORT_TEXT)}...{" "}
                <button type="button" onClick={() => setShowAll(true)} className="font-medium">
                  more
                </button>
              </p>
            )}
          </div>
        )}
      </div>

      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent accessibleTitle={null}>
          <DrawerTitleBar title="Description" />
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 pt-3">
            <h3 className="text-base font-semibold leading-snug [overflow-wrap:anywhere]">{video.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {video.views} <span aria-hidden="true">•</span> {video.timeAgo}
            </p>
            <DescriptionText text={description} className="mt-3 text-sm leading-relaxed" />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

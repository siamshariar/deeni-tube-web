// components/video-card.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { DurationBadge } from "@/components/duration-badge";
import { Dots } from "@/components/media-details";
import { HiddenMedia, MediaMenu, useNotInterested } from "@/components/media-menu";
import { WatchedBar } from "@/components/watched-bar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getChannelHref } from "@/lib/channel-data";
import { imagePriorityProps, type ImagePriority } from "@/lib/image-priority";
import { warmYouTube } from "@/lib/warm-youtube";
import { videoPath } from "@/lib/video-url";
import { InlinePreview } from "@/components/inline-preview";

interface VideoCardProps {
  isHorizontal?: boolean;
  videoId: string;
  title: string;
  channel: string;
  channelId: string;
  channelAvatar: string;
  views: string;
  timestamp: string;
  duration: string;
  thumbnail: string;
  /** Loading hint for cards above the fold (see lib/image-priority) */
  imagePriority?: ImagePriority;
}

export default function VideoCard({
  isHorizontal = false,
  videoId,
  title,
  channel,
  channelId,
  channelAvatar,
  views,
  timestamp,
  duration,
  thumbnail,
  imagePriority,
}: VideoCardProps) {
  const notInterested = useNotInterested();
  // "Not interested": the card itself says so, with Undo (as YouTube's does): no message needed
  if (notInterested.hidden)
    return <HiddenMedia onUndo={notInterested.undo} className={isHorizontal ? "aspect-video rounded-none sm:rounded-xl" : "aspect-video"} />;

  const videoLink = videoPath({ title, videoId });
  const channelLink = getChannelHref(channelId);

  const menu = (
    <MediaMenu
      scope="suggested"
      media={{ id: videoId, videoId, title, channel, channelId, channelAvatar, views, timeAgo: timestamp, duration }}
      onNotInterested={notInterested.hide}
    />
  );

  const avatar = (
    <Link aria-label={channel} href={channelLink} className="mt-0.5 flex-shrink-0">
      <Avatar className="h-9 w-9">
        <AvatarImage src={channelAvatar} alt="" />
        <AvatarFallback className="text-sm font-medium">{channel.charAt(0)}</AvatarFallback>
      </Avatar>
    </Link>
  );

  if (isHorizontal) {
    // Phone list item: edge-to-edge thumbnail, details underneath (YouTube mobile)
    return (
      <div className="flex flex-col" onPointerEnter={warmYouTube} onTouchStart={warmYouTube}>
        {/* Plays in the card while it's on screen, as in the YouTube app (Settings → Playback in feeds) */}
        <InlinePreview videoId={videoId} title={title} rounded="sm:rounded-xl">
          <Link href={videoLink} className="block">
            <div className="relative aspect-video w-full bg-muted sm:overflow-hidden sm:rounded-xl">
              <Image src={thumbnail} alt={title} fill sizes="100vw" {...imagePriorityProps(imagePriority)} className="object-cover" />
              <DurationBadge>{duration}</DurationBadge>
              <WatchedBar videoId={videoId} />
            </div>
          </Link>
        </InlinePreview>
        <div className="flex gap-3 pl-3 pr-1 pt-3">
          {avatar}
          <div className="min-w-0 flex-1">
            <Link href={videoLink} className="line-clamp-2 text-[15px] font-medium leading-5">{title}</Link>
            <Dots className="mt-1 text-[13px] leading-[18px] text-muted-foreground">
              <Link href={channelLink} className="block truncate hover:text-foreground">{channel}</Link>
              {views}
              {timestamp}
            </Dots>
          </div>
          <div className="-mt-2">{menu}</div>
        </div>
      </div>
    );
  }

  // Grid card (YouTube home layout): rounded thumbnail, avatar + text below, no card chrome
  return (
    <div className="group/card flex min-w-0 flex-col" onPointerEnter={warmYouTube} onTouchStart={warmYouTube}>
      {/* The video plays in the thumbnail: on hover with a mouse, on screen on touch devices (Settings → Playback in feeds) */}
      <InlinePreview videoId={videoId} title={title} className="rounded-xl">
        <Link href={videoLink} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
            <Image
              src={thumbnail}
              alt={title}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              {...imagePriorityProps(imagePriority)}
              className="object-cover"
            />
            <DurationBadge>{duration}</DurationBadge>
            <WatchedBar videoId={videoId} />
          </div>
        </Link>
      </InlinePreview>
      <div className="flex gap-3 pt-3">
        {avatar}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-medium leading-[22px]">
            <Link href={videoLink} className="line-clamp-2 [overflow-wrap:anywhere]" title={title}>{title}</Link>
          </h3>
          <Link href={channelLink} className="mt-1 block truncate text-sm leading-5 text-muted-foreground transition-colors hover:text-foreground">
            {channel}
          </Link>
          <p className="truncate text-sm leading-5 text-muted-foreground">
            {views}<span aria-hidden="true"> • </span>{timestamp}
          </p>
        </div>
        <div className="-mr-2 -mt-1.5">{menu}</div>
      </div>
    </div>
  );
}

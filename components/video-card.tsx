// components/video-card.tsx
"use client";

import { Clock, UserX, Flag, EyeOff } from "lucide-react";
import { SaveIcon, ShareIcon } from "@/components/icons/action-icons";
import Image from "next/image";
import Link from "next/link";
import { WatchedBar } from "@/components/watched-bar";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useWatchLater } from "@/hooks/useWatchLater";
import { useDontRecommend } from "@/hooks/useDontRecommend";
import { openSaveCard } from "@/lib/save-card";
import { ShareModal } from "@/components/share-modal";
import { ReportDialog } from "@/components/report-dialog";
import { getChannelHref } from "@/lib/channel-data";
import { imagePriorityProps, type ImagePriority } from "@/lib/image-priority";
import { MoreButton } from "@/components/more-button";
import { warmYouTube } from "@/lib/warm-youtube";
import { cn } from "@/lib/utils";
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
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [open, setOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const saveToPlaylist = () => openSaveCard({ id: videoId, title, channel });
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { toggleWatchLater, isInWatchLater } = useWatchLater();
  const dontRecommend = useDontRecommend();

  // Read straight from the shared Watch Later store
  const saved = isInWatchLater(videoId);

  const handleWatchLaterToggle = () =>
    toggleWatchLater({ id: videoId, title, channel, channelAvatar, thumbnail, views, timeAgo: timestamp, duration });

  const handleDontRecommend = () => dontRecommend(channelId, channel);

  // The card itself says so, with Undo (as YouTube's does): no message needed
  const handleNotInterested = () => setHidden(true);

  const videoUrl = `${window.location.origin}${videoPath({ title, videoId })}`;

  if (hidden)
    return (
      <div
        role="status"
        className={cn("flex aspect-video w-full flex-col items-center justify-center gap-3 bg-muted p-4 text-center", isHorizontal ? "sm:rounded-xl" : "rounded-xl")}
      >
        <p className="text-sm">Video removed</p>
        <button
          type="button"
          onClick={() => setHidden(false)}
          className="h-9 rounded-full bg-background px-4 text-sm font-medium transition-colors hover:bg-accent active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Undo
        </button>
      </div>
    );

  // Drawer items (mobile)
  const drawerItems = (
    <>
      <div className="flex items-center gap-4 px-4 py-3 text-[15px] hover:bg-muted active:bg-accent cursor-pointer" onClick={() => { setOpen(false); setTimeout(() => setShowShareModal(true), 150); }}>
        <ShareIcon className="h-5 w-5" /><span>Share</span>
      </div>
      <div className="flex items-center gap-4 px-4 py-3 text-[15px] hover:bg-muted active:bg-accent cursor-pointer" onClick={() => { setOpen(false); handleWatchLaterToggle(); }}>
        <Clock className="h-5 w-5" /><span>{saved ? "Remove from Watch later" : "Save to Watch later"}</span>
      </div>
      <div className="flex items-center gap-4 px-4 py-3 text-[15px] hover:bg-muted active:bg-accent cursor-pointer" onClick={() => { setOpen(false); setTimeout(saveToPlaylist, 150); }}>
        <SaveIcon className="h-5 w-5" /><span>Save to playlist</span>
      </div>
      <div className="flex items-center gap-4 px-4 py-3 text-[15px] hover:bg-muted active:bg-accent cursor-pointer" onClick={() => { setOpen(false); handleDontRecommend(); }}>
        <UserX className="h-5 w-5" /><span>Don&apos;t recommend channel</span>
      </div>
      <div className="flex items-center gap-4 px-4 py-3 text-[15px] hover:bg-muted active:bg-accent cursor-pointer" onClick={() => { setOpen(false); handleNotInterested(); }}>
        <EyeOff className="h-5 w-5" /><span>Not interested</span>
      </div>
      <div className="flex items-center gap-4 px-4 py-3 text-[15px] hover:bg-muted active:bg-accent cursor-pointer" onClick={() => { setOpen(false); setTimeout(() => setShowReportDialog(true), 150); }}>
        <Flag className="h-5 w-5" /><span>Report</span>
      </div>
    </>
  );

  // Dropdown items (desktop): the ones that open a dialog use afterClose, so the menu closes first
  const dropdownItems = (
    <>
      <DropdownMenuItem className="flex items-center gap-4 px-4 py-2 text-sm cursor-pointer" afterClose={() => setShowShareModal(true)}>
        <ShareIcon className="h-5 w-5" /><span>Share</span>
      </DropdownMenuItem>
      <DropdownMenuItem className="flex items-center gap-4 px-4 py-2 text-sm cursor-pointer" onSelect={handleWatchLaterToggle}>
        <Clock className="h-5 w-5" /><span>{saved ? "Remove from Watch later" : "Save to Watch later"}</span>
      </DropdownMenuItem>
      <DropdownMenuItem className="flex items-center gap-4 px-4 py-2 text-sm cursor-pointer" afterClose={saveToPlaylist}>
        <SaveIcon className="h-5 w-5" /><span>Save to playlist</span>
      </DropdownMenuItem>
      <DropdownMenuItem className="flex items-center gap-4 px-4 py-2 text-sm cursor-pointer" onSelect={handleDontRecommend}>
        <UserX className="h-5 w-5" /><span>Don&apos;t recommend channel</span>
      </DropdownMenuItem>
      <DropdownMenuItem className="flex items-center gap-4 px-4 py-2 text-sm cursor-pointer" onSelect={handleNotInterested}>
        <EyeOff className="h-5 w-5" /><span>Not interested</span>
      </DropdownMenuItem>
      <DropdownMenuItem className="flex items-center gap-4 px-4 py-2 text-sm cursor-pointer" afterClose={() => setShowReportDialog(true)}>
        <Flag className="h-5 w-5" /><span>Report</span>
      </DropdownMenuItem>
    </>
  );

  const videoLink = videoPath({ title, videoId });
  const channelLink = getChannelHref(channelId);

  // Three-dot menu (always visible): a bottom drawer on phones, a dropdown elsewhere
  const menu = isMobile ? (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <MoreButton onClick={(e) => e.stopPropagation()} />
      </DrawerTrigger>
      <DrawerContent accessibleTitle="Video actions" className="px-0 max-h-[70vh]">
        <div className="mt-2 pb-6">{drawerItems}</div>
      </DrawerContent>
    </Drawer>
  ) : (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <MoreButton onClick={(e) => e.stopPropagation()} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl py-2">{dropdownItems}</DropdownMenuContent>
    </DropdownMenu>
  );

  const dialogs = (
    <>
      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} videoUrl={videoUrl} />
      <ReportDialog videoTitle={title} videoId={videoId} open={showReportDialog} onOpenChange={setShowReportDialog} />
    </>
  );

  const avatar = (
    <Link aria-label={channel} href={channelLink} className="mt-0.5 flex-shrink-0">
      <Avatar className="h-9 w-9">
        <AvatarImage src={channelAvatar} alt="" />
        <AvatarFallback className="text-sm font-medium">{channel.charAt(0)}</AvatarFallback>
      </Avatar>
    </Link>
  );

  const durationBadge = duration ? (
    <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1 py-px text-xs font-medium leading-[18px] text-white">
      {duration}
    </span>
  ) : null;

  if (isHorizontal) {
    // Phone list item: edge-to-edge thumbnail, details underneath (YouTube mobile)
    return (
      <div className="flex flex-col" onPointerEnter={warmYouTube} onTouchStart={warmYouTube}>
        {/* Plays in the card while it's on screen, as in the YouTube app (Settings → Playback in feeds) */}
        <InlinePreview videoId={videoId} title={title} rounded="sm:rounded-xl">
          <Link href={videoLink} className="block">
            <div className="relative aspect-video w-full bg-muted sm:overflow-hidden sm:rounded-xl">
              <Image src={thumbnail} alt={title} fill sizes="100vw" {...imagePriorityProps(imagePriority)} className="object-cover" />
              {durationBadge}
              <WatchedBar videoId={videoId} />
            </div>
          </Link>
        </InlinePreview>
        <div className="flex gap-3 pl-3 pr-1 pt-3">
          {avatar}
          <div className="min-w-0 flex-1">
            <Link href={videoLink} className="line-clamp-2 text-[15px] font-medium leading-5">{title}</Link>
            <p className="mt-1 text-[13px] leading-[18px] text-muted-foreground">
              <Link href={channelLink} className="hover:text-foreground">{channel}</Link>
              <span aria-hidden="true"> · </span>{views}<span aria-hidden="true"> · </span>{timestamp}
            </p>
          </div>
          <div className="-mt-2">{menu}</div>
        </div>
        {dialogs}
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
            {durationBadge}
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
      {dialogs}
    </div>
  );
}

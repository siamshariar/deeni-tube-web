// components/video-grid.tsx
// The standard list of video cards (Home, a category, a channel, a scholar): a YouTube-style grid from md up, with 3
// columns beside the full sidebar and 4 beside the mini one (fewer on narrower screens), and a full-width list on phones.
// Only the first card loads its thumbnail early (see lib/image-priority).
"use client";

import VideoCard from "@/components/video-card";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import type { VideoItem } from "@/lib/video-data";
import { youtubeThumb } from "@/lib/media-lookup";
import { priorityForIndex } from "@/lib/image-priority";
import { cn } from "@/lib/utils";

interface VideoGridProps {
  videos: VideoItem[];
  className?: string;
}

/** The grid's columns, also for its placeholders */
export const videoColumns = (sidebarCollapsed: boolean) => (sidebarCollapsed ? "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-3");

export default function VideoGrid({ videos, className }: VideoGridProps) {
  const columns = videoColumns(useSidebarCollapsed());
  const card = (video: VideoItem, index: number, phone: boolean) => (
    <VideoCard
      key={video.id}
      videoId={video.videoId}
      title={video.title}
      channel={video.channel}
      channelId={video.channelId}
      channelAvatar={video.channelAvatar}
      views={video.views}
      timestamp={video.timeAgo}
      duration={video.duration}
      thumbnail={youtubeThumb(video.videoId)}
      isHorizontal={phone}
      imagePriority={priorityForIndex(index)}
    />
  );

  return (
    <div className={className}>
      <div className={cn("hidden md:grid gap-x-4 gap-y-10", columns)}>
        {videos.map((v, i) => card(v, i, false))}
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-4 sm:px-3 md:hidden">
        {videos.map((v, i) => card(v, i, true))}
      </div>
    </div>
  );
}

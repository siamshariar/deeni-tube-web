// components/video-grid.tsx
// The standard list of video cards: a YouTube-style grid from md up and a full-width
// list on phones. Only the first card loads its thumbnail early (see lib/image-priority).
"use client";

import VideoCard from "@/components/video-card";
import type { VideoItem } from "@/lib/video-data";
import { youtubeThumb } from "@/lib/media-lookup";
import { priorityForIndex } from "@/lib/image-priority";
import { cn } from "@/lib/utils";

interface VideoGridProps {
  videos: VideoItem[];
  /** Column classes for the md+ grid */
  columns?: string;
  className?: string;
}

export default function VideoGrid({
  videos,
  columns = "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  className,
}: VideoGridProps) {
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-4 md:hidden">
        {videos.map((v, i) => card(v, i, true))}
      </div>
    </div>
  );
}

// lib/history-entry.ts
import type { HistoryItem } from "@/lib/history-data";
import type { VideoItem } from "@/lib/video-data";

/** History entry for a main-feed video. */
export function historyEntryForVideo(v: VideoItem): Omit<HistoryItem, "watchedDate"> {
  return {
    id: v.id,
    type: "video",
    videoId: v.videoId,
    title: v.title,
    channel: v.channel,
    channelId: v.channelId,
    channelAvatar: v.channelAvatar,
    thumbnail: `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
    duration: v.duration,
    views: v.views,
    timeAgo: v.timeAgo,
  };
}

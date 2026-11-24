// lib/history-entry.ts
import { viewsText } from "@/lib/format";
import type { HistoryItem } from "@/lib/history-data";
import type { ShortVideo } from "@/lib/shorts-data";
import type { VideoItem } from "@/lib/video-data";

const thumbnail = (videoId: string) => `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

/** History entry for a main-feed video. */
export function historyEntryForVideo(v: VideoItem): Omit<HistoryItem, "watchedDate"> {
  return {
    id: v.id,
    type: v.isShort ? "short" : "video",
    videoId: v.videoId,
    title: v.title,
    channel: v.channel,
    channelId: v.channelId,
    channelAvatar: v.channelAvatar,
    thumbnail: thumbnail(v.videoId),
    duration: v.duration,
    views: v.views,
    timeAgo: v.timeAgo,
  };
}

/** History entry for a short. */
export function historyEntryForShort(s: ShortVideo): Omit<HistoryItem, "watchedDate"> {
  return {
    id: s.id,
    type: "short",
    videoId: s.videoId,
    title: s.title,
    channel: s.channel,
    channelId: s.channelId,
    channelAvatar: s.channelAvatar,
    thumbnail: thumbnail(s.videoId),
    duration: s.duration,
    views: viewsText(s.views),
    timeAgo: s.timeAgo,
  };
}

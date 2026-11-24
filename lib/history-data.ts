// lib/history-data.ts
// Demo watch history used to seed the History store on first visit: real videos and shorts of the catalogue, each once.
import { historyEntryForShort, historyEntryForVideo } from "@/lib/history-entry";
import { shortsVideos } from "@/lib/shorts-data";
import { videoData } from "@/lib/video-data";

export interface HistoryItem {
  id: string;
  type: "video" | "short";
  /** YouTube id */
  videoId: string;
  title: string;
  channel: string;
  channelId: string;
  channelAvatar: string;
  thumbnail: string;
  duration: string;
  views: string;
  timeAgo: string;
  /** Epoch ms of when it was watched */
  watchedDate: number;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// How long ago each was watched, newest first: today, yesterday, this week, and (videos) over a month ago
const SHORTS_AGO = [1, 2, 3, 4, 5, 6].map((h) => h * HOUR).concat([0, 1, 2, 3].map((i) => DAY + i * HOUR), [3, 4, 5, 6].map((d) => d * DAY));
const VIDEOS_AGO = [2, 4, 6, 8, 10].map((h) => h * HOUR).concat([0, 3, 6].map((h) => DAY + h * HOUR), [3, 4, 5, 6].map((d) => d * DAY), [35 * DAY, 35 * DAY]);

export function historySeed(): HistoryItem[] {
  const now = Date.now();
  return [
    ...videoData.slice(0, VIDEOS_AGO.length).map((v, i) => ({ ...historyEntryForVideo(v), watchedDate: now - VIDEOS_AGO[i] })),
    ...shortsVideos.slice(0, SHORTS_AGO.length).map((s, i) => ({ ...historyEntryForShort(s), watchedDate: now - SHORTS_AGO[i] })),
  ];
}

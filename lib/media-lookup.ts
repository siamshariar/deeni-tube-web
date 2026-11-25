// lib/media-lookup.ts
// Pages identify the same video or short differently (internal id like "v3" or "s2", or its YouTube id).
// These helpers resolve either form, so a saved item is stored under one id.

import { viewsText } from "@/lib/format";
import { shortRatio } from "@/lib/short-ratios";
import { shortsVideos, ShortVideo } from "@/lib/shorts-data";
import { videoData, VideoItem } from "@/lib/video-data";
import { videoPath } from "@/lib/video-url";

export function findVideo(id: string): VideoItem | undefined {
  return videoData.find((v) => v.id === id) ?? videoData.find((v) => v.videoId === id);
}

export function findShort(id: string): ShortVideo | undefined {
  return shortsVideos.find((s) => s.id === id) ?? shortsVideos.find((s) => s.videoId === id);
}

/** The one id a video or short is stored under (the given id when it isn't in the catalogue). */
export function canonicalMediaId(id: string): string {
  return findVideo(id)?.id ?? findShort(id)?.id ?? id;
}

/** A short in a video's shape, for lists that hold both (playlists). */
function shortAsVideo(s: ShortVideo): VideoItem {
  return {
    id: s.id, videoId: s.videoId, title: s.title, channel: s.channel, channelId: s.channelId, channelAvatar: s.channelAvatar,
    duration: s.duration, views: viewsText(s.views), timeAgo: s.timeAgo, description: s.description, language: "", category: "Shorts", isShort: true, ratio: shortRatio(s.videoId),
  };
}

/** A video or short by either id, as a video: what a playlist holds. */
export function findPlayable(id: string): VideoItem | undefined {
  const video = findVideo(id);
  if (video) return video;
  const short = findShort(id);
  return short && shortAsVideo(short);
}

/** Extracts the YouTube id from an img.youtube.com thumbnail URL. */
export function youtubeIdFromThumbnail(url?: string): string | undefined {
  return url?.match(/\/vi\/([^/]+)\//)?.[1];
}

/**
 * YouTube thumbnail URL. "small" is 320×180 (~13 KB), right for images up to ~170 CSS px wide;
 * "medium" is 480×360 (~30 KB) for larger cards. Use the same size everywhere a page renders the
 * same video twice (e.g. desktop + mobile copies), so the browser downloads it only once.
 */
export function youtubeThumb(videoId: string, size: "small" | "medium" = "medium"): string {
  return `https://img.youtube.com/vi/${videoId}/${size === "small" ? "mqdefault" : "hqdefault"}.jpg`;
}

/** Where a video or short opens. */
export function mediaPath(media: { title: string; videoId: string; isShort?: boolean }): string {
  return media.isShort ? `/shorts?v=${media.videoId}` : videoPath(media);
}

/** The small picture of a video or short (by either id), for messages; undefined when it isn't in the catalogue. */
export function mediaThumb(id: string): { src: string; short: boolean } | undefined {
  const media = findPlayable(id);
  return media && { src: youtubeThumb(media.videoId, "small"), short: !!media.isShort };
}

// lib/media-lookup.ts
// Pages identify the same video differently (internal id like "v3" vs YouTube id).
// These helpers resolve either form so saved items are stored under one id.

import { videoData, VideoItem } from "@/lib/video-data";
import { shortsVideos, ShortVideo } from "@/lib/shorts-data";

export function findVideo(id: string): VideoItem | undefined {
  return videoData.find((v) => v.id === id) ?? videoData.find((v) => v.videoId === id);
}

export function findShort(id: string): ShortVideo | undefined {
  return shortsVideos.find((s) => s.id === id) ?? shortsVideos.find((s) => s.youtubeId === id);
}

/** Canonical id for a main-feed video (falls back to the given id). */
export function canonicalVideoId(id: string): string {
  return findVideo(id)?.id ?? id;
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

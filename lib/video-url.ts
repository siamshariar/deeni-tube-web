// lib/video-url.ts
// Links to video pages: /videos/<title in Latin letters>/<YouTube id>, e.g.
// /videos/islamic-halaka-shesh-jamanar-fitna-prof-dr-mohammad-monzur-e/XVscS6piz9A
// Readable and clean to share (no %20 or %E0%A6… codes). Only the id finds the video; the title part is for
// people, and links with anything else there (older links used the channel name) redirect to this one.
import { slugify } from "@/lib/slug";
import { videoData } from "@/lib/video-data";

export function videoSlug(title: string): string {
  return slugify(title, { maxLength: 60, fallback: "video" });
}

export function videoPath(video: { title: string; videoId: string }): string {
  return `/videos/${videoSlug(video.title)}/${video.videoId}`;
}

/** Link to a video by its YouTube id (looks up the title) */
export function videoPathForId(videoId: string): string {
  const video = videoData.find((v) => v.videoId === videoId);
  return video ? videoPath(video) : `/videos/video/${videoId}`;
}

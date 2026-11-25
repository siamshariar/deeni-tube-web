// lib/share-path.ts
import { videoPath } from "@/lib/video-url";

/** One short's own address, as on YouTube */
export const shortPath = (videoId: string) => `/shorts/${videoId}`;
/** The address a video or short is shared with (a short's own page, so the link shows its picture) */
export const sharePath = (media: { title: string; videoId: string; isShort?: boolean }) => (media.isShort ? shortPath(media.videoId) : videoPath(media));
/** The Shorts feed: /shorts, /shorts/<id> */
export const isShortsPath = (pathname: string | null | undefined) => /^\/shorts(\/|$)/.test(pathname ?? "");

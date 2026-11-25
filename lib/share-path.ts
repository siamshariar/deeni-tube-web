// lib/share-path.ts
import { PUBLIC_URL } from "@/lib/site";
import { videoPath } from "@/lib/video-url";

/** One short's own address, as on YouTube */
export const shortPath = (videoId: string) => `/shorts/${videoId}`;
/** The address a video or short is shared with (a short's own page, so the link shows its picture) */
export const sharePath = (media: { title: string; videoId: string; isShort?: boolean }) => (media.isShort ? shortPath(media.videoId) : videoPath(media));
/** The Shorts feed: /shorts, /shorts/<id> */
export const isShortsPath = (pathname: string | null | undefined) => /^\/shorts(\/|$)/.test(pathname ?? "");

// This computer, the local network: nobody else can open a link to it, and no app can show its picture and title
const ONLY_HERE = /^(localhost|127\..+|10\..+|192\.168\..+|172\.(1[6-9]|2\d|3[01])\..+|\[.+\]|.+\.(localhost|local|test|lan))$/;
/** The link a page of this site (a path or its full address) is shared with: where everyone can open it */
export function shareUrl(link: string): string {
  const url = new URL(link, window.location.origin);
  if (url.origin !== window.location.origin || !ONLY_HERE.test(url.hostname)) return url.href;
  return PUBLIC_URL + url.pathname + url.search + url.hash;
}

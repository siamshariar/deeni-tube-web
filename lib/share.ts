// lib/share.ts

const SHARE_INTENTS: Record<string, (url: string) => string> = {
  Facebook: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  WhatsApp: (url) => `https://wa.me/?text=${encodeURIComponent(url)}`,
  X: (url) => `https://x.com/intent/post?url=${encodeURIComponent(url)}`,
};

/** Opens the platform's share page in a new tab. */
export function openShareIntent(platform: string, url: string) {
  const build = SHARE_INTENTS[platform];
  if (build) window.open(build(url), "_blank", "noopener,noreferrer");
}

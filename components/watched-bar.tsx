// components/watched-bar.tsx
// YouTube's red "watched" bar along the bottom of a video thumbnail (lib/watch-progress). Put it inside the
// thumbnail's box (relative, overflow-hidden), next to the duration badge; nothing shows for unwatched videos.
"use client";

import { useWatchedFraction } from "@/lib/watch-progress";

export function WatchedBar({ videoId }: { videoId: string }) {
  const fraction = useWatchedFraction(videoId);
  if (!fraction) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-white/40" data-watched={Math.round(fraction * 100)}>
      <div className="h-full bg-[#f03]" style={{ width: `${Math.max(2, fraction * 100)}%` }} />
    </div>
  );
}

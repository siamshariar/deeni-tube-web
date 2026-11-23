// components/storyboard.tsx
// A video's frame at a given time, from YouTube's storyboard (lib/storyboard), for progress bars: the box over the
// pointer while hovering and the picture over the whole video while dragging, on the watch page's player and in
// cards. It fills its parent's height; the small frame that's already loaded shows until the sharp one is there.
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { frameAt, frameBackground, loadSheet, loadStoryboard, type Storyboard } from "@/lib/storyboard";

/** Frame sizes, as YouTube uses them: 160×90 in cards and over the whole video, 320×180 in the watch page's box */
export const STORYBOARD_MEDIUM = 2;
export const STORYBOARD_LARGE = 3;

/** The video's storyboard, loaded once `wanted` (the progress bar is about to be used); null without one. */
export function useStoryboard(videoId: string, wanted: boolean): Storyboard | null {
  const [loaded, setLoaded] = useState<{ videoId: string; board: Storyboard | null } | null>(null);
  useEffect(() => {
    if (!wanted) return;
    let mounted = true;
    void loadStoryboard(videoId).then((board) => {
      if (mounted) setLoaded({ videoId, board });
    });
    return () => {
      mounted = false;
    };
  }, [videoId, wanted]);
  return loaded?.videoId === videoId ? loaded.board : null;
}

export function StoryboardFrame({
  board,
  level,
  time,
  duration,
  className,
}: {
  board: Storyboard;
  level: number;
  time: number;
  duration: number;
  className?: string;
}) {
  const frame = frameAt(board, level, time, duration);
  const small = frameAt(board, 0, time, duration);
  const { url, sheet, sheets } = frame;

  // The sheets before and after this one, so moving along the bar doesn't wait for them
  useEffect(() => {
    let mounted = true;
    void loadSheet(url).then(() => {
      if (!mounted) return;
      for (const n of [sheet + 1, sheet - 1])
        if (n >= 0 && n < sheets) void loadSheet(board.levels[Math.min(level, board.levels.length - 1)].url.replace("$M", String(n)));
    });
    return () => {
      mounted = false;
    };
  }, [board, level, url, sheet, sheets]);

  const layers = [frameBackground(frame), frameBackground(small)];
  return (
    <div
      aria-hidden="true"
      data-storyboard={Math.floor(time)}
      className={cn("h-full max-w-full bg-no-repeat", className)}
      style={{
        aspectRatio: board.aspect,
        backgroundImage: layers.map((l) => l.image).join(", "),
        backgroundSize: layers.map((l) => l.size).join(", "),
        backgroundPosition: layers.map((l) => l.position).join(", "),
      }}
    />
  );
}

// components/moving-thumbnail.tsx
// A video's thumbnail moving on hover, as in YouTube's related list: frames of the video follow each other over the
// thumbnail (and its duration), without playing the video: no player, no sound. The frames come from its storyboard
// (lib/storyboard): YouTube's own moving pictures (`an_webp`) have signed links that only last a few hours.
// Put it last inside the thumbnail's box (relative, overflow-hidden). Nothing loads until `active`.
"use client";

import { useEffect, useState } from "react";
import { feedPlaybackOn } from "@/lib/feed-playback";
import { frameBackground, loadSheet, movingFrames, storyboardOf, type StoryboardFrameAt } from "@/lib/storyboard";

const REST_MS = 80; // the mouse only passing over doesn't load anything
const FRAME_MS = 400;

export function MovingThumbnail({ videoId, active }: { videoId: string; active: boolean }) {
  const [shown, setShown] = useState<{ frame: StoryboardFrameAt; before?: StoryboardFrameAt; aspect: number } | null>(null);

  useEffect(() => {
    if (!active || !feedPlaybackOn() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = async () => {
      const board = await storyboardOf(videoId);
      if (!board || stopped) return;
      const frames = movingFrames(board);
      const show = async (n: number) => {
        const frame = frames[n];
        const loaded = await loadSheet(frame.url);
        if (stopped) return;
        if (loaded) {
          setShown((prev) => ({ frame, before: prev?.frame, aspect: board.aspect }));
          // The next part of the video, ready when this one ends
          const next = frames.slice(n).find((f) => f.url !== frame.url);
          if (next) void loadSheet(next.url);
        } else if (n === 0) return; // can't load: the thumbnail stays
        timer = setTimeout(() => void show((n + 1) % frames.length), FRAME_MS);
      };
      if (frames.length > 1) void show(0);
    };
    timer = setTimeout(() => void start(), REST_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
      setShown(null);
    };
  }, [active, videoId]);

  if (!shown) return null;
  // The frame before stays underneath, so a new sheet never flashes empty
  const layers = [shown.frame, ...(shown.before ? [shown.before] : [])].map(frameBackground);
  return (
    <div aria-hidden="true" data-moving className="absolute inset-0 flex items-center justify-center bg-black">
      <div
        className={shown.aspect >= 16 / 9 ? "w-full bg-no-repeat" : "h-full bg-no-repeat"}
        style={{
          aspectRatio: shown.aspect,
          backgroundImage: layers.map((l) => l.image).join(", "),
          backgroundSize: layers.map((l) => l.size).join(", "),
          backgroundPosition: layers.map((l) => l.position).join(", "),
        }}
      />
    </div>
  );
}

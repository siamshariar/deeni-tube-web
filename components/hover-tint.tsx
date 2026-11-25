// components/hover-tint.tsx
// A card or row on hover, as on YouTube (measured): its thumbnail's colour behind it, 13% strong (17% in dark). Put it
// first in an element that is `group/tint relative isolate`. Grid cards: 12px out, 16px corners; rows: 8px out, 8px corners.
// Only with a mouse. (YouTube's search results and Shorts cards have none.)
"use client";

import { useState } from "react";
import { storyboardOf } from "@/lib/storyboard";
import { thumbTints } from "@/lib/thumb-tints";
import { cn } from "@/lib/utils";

export function HoverTint({ videoId, className }: { videoId: string; className: string }) {
  return (
    <div
      aria-hidden="true"
      data-tint
      style={{ "--tint": `${thumbTints[videoId] ?? "0 0%"} 53%` } as React.CSSProperties}
      className={cn(
        "pointer-events-none absolute -z-10 bg-[hsl(var(--tint)/0.13)] opacity-0 transition-opacity duration-300 can-hover:group-hover/tint:opacity-100 dark:bg-[hsl(var(--tint)/0.17)]",
        className
      )}
    />
  );
}

/** A list's row with both of YouTube's hover effects: the colour, and its thumbnail moving (pass `hovered` to MovingThumbnail) */
export function HoverRow({ videoId, className, children, ...props }: { videoId: string; children: (hovered: boolean) => React.ReactNode } & Omit<React.HTMLAttributes<HTMLDivElement>, "children">) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      {...props}
      className={cn("group/tint relative isolate", className)}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        setHovered(true);
        void storyboardOf(videoId); // the moving thumbnail's data, loaded once
      }}
      onPointerLeave={() => setHovered(false)}
    >
      <HoverTint videoId={videoId} className="-inset-x-2 inset-y-0 rounded-lg" />
      {children(hovered)}
    </div>
  );
}

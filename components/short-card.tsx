// components/short-card.tsx
// The standard Shorts card (9:16 thumbnail, title, views, three-dot menu). Same type sizes as VideoCard: 15px/16px
// title, 13px/14px secondary text (phone/desktop).
"use client";

import Image from "next/image";
import Link from "next/link";
import { HiddenMedia, MediaMenu, useNotInterested, type MenuMedia } from "@/components/media-menu";
import type { MenuAction } from "@/components/action-menu";
import { ROW_DETAILS, ROW_TITLE } from "@/components/page-layout";
import { cn } from "@/lib/utils";
import { imagePriorityProps, type ImagePriority } from "@/lib/image-priority";
import { youtubeThumb } from "@/lib/media-lookup";
import { warmYouTube } from "@/lib/warm-youtube";

interface ShortCardProps {
  short: MenuMedia;
  /** Which menu (see media-menu) */
  scope: "suggested" | "own";
  extra?: MenuAction[];
  inWatchLater?: boolean;
  imagePriority?: ImagePriority;
  className?: string;
}

/** Columns of Shorts cards, the same wherever they fill the page's width */
export const SHORTS_GRID = "grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-3 md:gap-x-4 lg:grid-cols-4 xl:grid-cols-5";

export default function ShortCard({ short, scope, extra, inWatchLater, imagePriority, className }: ShortCardProps) {
  const notInterested = useNotInterested();
  if (notInterested.hidden) return <HiddenMedia short onUndo={notInterested.undo} className={cn("aspect-[9/16]", className)} />;
  const href = `/shorts?v=${short.videoId}`;
  return (
    <div className={cn("flex min-w-0 flex-col", className)} onPointerEnter={warmYouTube} onTouchStart={warmYouTube}>
      <Link href={href} className="relative block aspect-[9/16] w-full overflow-hidden rounded-xl bg-muted" tabIndex={-1} aria-hidden="true">
        <Image src={youtubeThumb(short.videoId)} alt="" fill sizes="(min-width: 768px) 220px, 50vw" {...imagePriorityProps(imagePriority)} className="object-cover" />
      </Link>
      <div className="flex items-start gap-1 pt-2">
        <Link href={href} className="min-w-0 flex-1">
          <h3 className={ROW_TITLE}>{short.title}</h3>
          <p className={cn("mt-1", ROW_DETAILS)}>{short.views}</p>
        </Link>
        <div className="-mr-2 -mt-2 flex-shrink-0">
          <MediaMenu media={{ ...short, isShort: true }} scope={scope} extra={extra} inWatchLater={inWatchLater} onNotInterested={scope === "suggested" ? notInterested.hide : undefined} />
        </div>
      </div>
    </div>
  );
}

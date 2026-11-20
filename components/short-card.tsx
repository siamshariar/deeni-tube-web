// components/short-card.tsx
// The standard Shorts card (9:16 thumbnail, title, views, three-dot menu). Same type
// sizes as VideoCard: 15px/16px title, 13px/14px secondary text (phone/desktop).
"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { imagePriorityProps, type ImagePriority } from "@/lib/image-priority";
import { warmYouTube } from "@/lib/warm-youtube";

interface ShortCardProps {
  href: string;
  title: string;
  /** Display text, e.g. "25K views" */
  views: string;
  thumbnail: string;
  imagePriority?: ImagePriority;
  /** The three-dot menu; use MoreButton as its trigger */
  menu?: ReactNode;
  className?: string;
}

export default function ShortCard({ href, title, views, thumbnail, imagePriority, menu, className }: ShortCardProps) {
  return (
    <div className={cn("flex min-w-0 flex-col", className)} onPointerEnter={warmYouTube} onTouchStart={warmYouTube}>
      <Link href={href} className="relative block aspect-[9/16] w-full overflow-hidden rounded-xl bg-muted">
        <Image src={thumbnail} alt={title} fill sizes="(min-width: 768px) 220px, 50vw" {...imagePriorityProps(imagePriority)} className="object-cover" />
      </Link>
      <div className="flex items-start gap-1 pt-2">
        <Link href={href} className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[15px] font-medium leading-5 md:text-base md:leading-[22px]">{title}</h3>
          <p className="mt-1 text-[13px] leading-[18px] text-muted-foreground md:text-sm md:leading-5">{views}</p>
        </Link>
        {menu && <div className="-mr-2 -mt-2 flex-shrink-0">{menu}</div>}
      </div>
    </div>
  );
}

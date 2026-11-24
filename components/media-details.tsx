// components/media-details.tsx
// "2.3M views • 6 months ago" in a row or under a card. `Dots` puts a dot between its parts, but never at the start or the
// end of a line when they wrap; in the small rows on phones the time is YouTube's short form ("6mo ago"), so both fit.
import { Children, type ReactNode } from "react";
import { shortAgo } from "@/lib/time-ago";
import { cn } from "@/lib/utils";

export function Dots({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("dots", className)}>
      <span>
        {Children.toArray(children).map((part, i) => (
          <span key={i}>{part}</span>
        ))}
      </span>
    </p>
  );
}

/** A row's views and time: short on phones, in full from md up */
export function RowMeta({ views, timeAgo, className }: { views: string; timeAgo: string; className?: string }) {
  return (
    <Dots className={className}>
      {views}
      <>
        <span aria-hidden="true" className="md:hidden">{shortAgo(timeAgo)}</span>
        <span className="sr-only md:not-sr-only">{timeAgo}</span>
      </>
    </Dots>
  );
}

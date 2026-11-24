// components/page-bar.tsx
// The phone's app bar of every page you go into (video, playlist, channel, scholar, category, help, more, donate):
// 48px under the header, a back arrow in a 44px circle and the page's name, 16px medium. From md up there is none: the
// page shows its title itself. One component, so the bars can't differ again.
"use client";

import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useBack } from "@/hooks/use-back";
import { cn } from "@/lib/utils";

interface PageBarProps {
  title: string;
  /** Where Back goes when the page was opened straight from a link */
  parent: string | (() => string);
  /** Instead of going back */
  onBack?: () => void;
  /** "h1" where the page shows no other title on phones */
  as?: "h1" | "p";
}

export const PAGE_BAR_HEIGHT = 48;
// (On a phone held sideways it scrolls away: header and bar would take a third of the screen)
const BAR = "sticky top-14 z-10 flex h-12 items-center gap-1 border-b bg-background pl-0.5 pr-3 md:hidden low:static";

export function PageBar({ title, parent, onBack, as: Title = "p" }: PageBarProps) {
  const back = useBack(parent);
  return (
    <div data-page-bar="" className={BAR}>
      <BackButton onClick={onBack ?? back} />
      <Title className="min-w-0 flex-1 truncate text-base font-medium leading-6">{title}</Title>
    </div>
  );
}

/** The bar while its page loads, at the same size */
export function PageBarSkeleton() {
  return (
    <div className={BAR} aria-hidden="true">
      <Skeleton className="mx-2.5 h-6 w-6 rounded-full" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

export function BackButton({ onClick, className, label = "Go back" }: { onClick: () => void; className?: string; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <ArrowLeft className="h-6 w-6" />
    </button>
  );
}

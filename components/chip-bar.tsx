// components/chip-bar.tsx
// YouTube's chips above a list (measured): 32px high, 8px apart, 14px medium, in one row that scrolls sideways. With a
// mouse, a side with more chips fades out (51–77px) and has an arrow button; with a finger the row is swiped.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Chip {
  id: string;
  label: string;
}

export function ChipBar({
  chips,
  selected,
  onSelect,
  label,
  className,
}: {
  chips: Chip[];
  selected: string;
  onSelect: (id: string) => void;
  label: string;
  className?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setMore((m) => (m.left === left && m.right === right ? m : { left, right }));
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const observer = new ResizeObserver(measure); // also reports the first size
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, chips]);

  const scroll = (direction: 1 | -1) => {
    const el = rowRef.current;
    el?.scrollBy({ left: direction * Math.max(120, el.clientWidth - 154), behavior: "smooth" });
  };

  const select = (id: string, button: HTMLElement) => {
    onSelect(id);
    // A chip under the faded side comes into view
    const el = rowRef.current;
    if (!el) return;
    const left = button.offsetLeft - el.scrollLeft;
    if (left < 77) el.scrollBy({ left: left - 77, behavior: "smooth" });
    else if (left + button.offsetWidth > el.clientWidth - 77) el.scrollBy({ left: left + button.offsetWidth - el.clientWidth + 77, behavior: "smooth" });
  };

  return (
    <div className={cn("relative", className)}>
      <div
        ref={rowRef}
        role="group"
        aria-label={label}
        onScroll={measure}
        className={cn(
          "scrollbar-none relative flex gap-2 overflow-x-auto overscroll-x-contain",
          more.left && !more.right && "can-hover:[mask-image:linear-gradient(90deg,transparent_51px,#000_77px)]",
          more.right && !more.left && "can-hover:[mask-image:linear-gradient(270deg,transparent_51px,#000_77px)]",
          more.left && more.right && "can-hover:[mask-image:linear-gradient(90deg,transparent_51px,#000_77px,#000_calc(100%-77px),transparent_calc(100%-51px))]"
        )}
      >
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            aria-pressed={chip.id === selected}
            onClick={(e) => select(chip.id, e.currentTarget)}
            className={cn(
              "h-8 flex-shrink-0 select-none whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              chip.id === selected ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-accent active:bg-accent"
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
      {(["left", "right"] as const).map(
        (side) =>
          more[side] && (
            <button
              key={side}
              type="button"
              tabIndex={-1} // the chips themselves are reached with Tab
              aria-label={side === "left" ? "Previous chips" : "More chips"}
              onClick={() => scroll(side === "left" ? -1 : 1)}
              className={cn(
                "absolute top-0 hidden h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-accent active:bg-accent can-hover:flex",
                side === "left" ? "left-0" : "right-0"
              )}
            >
              {side === "left" ? <ChevronLeft className="h-6 w-6" strokeWidth={1.5} /> : <ChevronRight className="h-6 w-6" strokeWidth={1.5} />}
            </button>
          )
      )}
    </div>
  );
}

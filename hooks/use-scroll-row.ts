"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A row that scrolls sideways, as YouTube's: which sides have more (fade, arrow) and scrolling there. `changes`: its contents.
 * (Its element is kept in state: in a dialog it only comes after the component that holds the row.)
 */
export function useScrollRow(changes: unknown, step: (width: number) => number) {
  const [row, rowRef] = useState<HTMLDivElement | null>(null);
  const [more, setMore] = useState({ left: false, right: false });
  const measure = useCallback(() => {
    if (!row) return;
    const left = row.scrollLeft > 1;
    const right = row.scrollLeft + row.clientWidth < row.scrollWidth - 1;
    setMore((m) => (m.left === left && m.right === right ? m : { left, right }));
  }, [row]);
  useEffect(() => {
    if (!row) return;
    const observer = new ResizeObserver(measure); // also reports the first size
    observer.observe(row);
    return () => observer.disconnect();
  }, [row, measure, changes]);
  const scroll = (direction: 1 | -1) => row?.scrollBy({ left: direction * step(row.clientWidth), behavior: "smooth" });
  return { row, rowRef, more, measure, scroll };
}

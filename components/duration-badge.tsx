// components/duration-badge.tsx
/** A thumbnail's length, at the bottom right. */
export function DurationBadge({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1 py-px text-xs font-medium leading-[18px] text-white">{children}</span>
  );
}

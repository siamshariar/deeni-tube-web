// app/watch-later/page.tsx
"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronsDown, ChevronsUp, Clock, Trash2 } from "lucide-react";
import type { MenuAction } from "@/components/action-menu";
import { EmptyState } from "@/components/empty-state";
import { LibraryChips, LibraryPage, LibraryRow, LibraryShorts, LibraryTitle, savedHref, type LibraryFilter } from "@/components/library";
import { SortDropdown } from "@/components/sort-dropdown";
import { Button } from "@/components/ui/button";
import { useWatchLater, type WatchLaterVideo } from "@/hooks/useWatchLater";
import { useHydrated } from "@/lib/local-store";
import { mediaThumb } from "@/lib/media-lookup";
import { notify } from "@/lib/notify";
import { daysAgo } from "@/lib/time-ago";

const SORT_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "added-newest", label: "Date added (newest)" },
  { value: "added-oldest", label: "Date added (oldest)" },
  { value: "popular", label: "Most popular" },
  { value: "published-newest", label: "Date published (newest)" },
  { value: "published-oldest", label: "Date published (oldest)" },
] as const;
type Sort = (typeof SORT_OPTIONS)[number]["value"];

const parseViews = (views: string): number => {
  const num = parseFloat(views.replace(/[^0-9.]/g, ""));
  if (views.includes("M")) return num * 1_000_000;
  if (views.includes("K")) return num * 1_000;
  return num;
};

const ORDER: Record<Exclude<Sort, "manual">, (a: WatchLaterVideo, b: WatchLaterVideo) => number> = {
  "added-newest": (a, b) => b.addedAt - a.addedAt,
  "added-oldest": (a, b) => a.addedAt - b.addedAt,
  popular: (a, b) => parseViews(b.views) - parseViews(a.views),
  "published-newest": (a, b) => daysAgo(a.timeAgo) - daysAgo(b.timeAgo),
  "published-oldest": (a, b) => daysAgo(b.timeAgo) - daysAgo(a.timeAgo),
};

export default function WatchLaterPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { videos: saved, setWatchLater, removeFromWatchLater } = useWatchLater();
  const videos = useMemo(() => saved.filter((v) => v.type !== "short"), [saved]);
  const shorts = useMemo(() => saved.filter((v) => v.type === "short"), [saved]);
  const setVideos = (next: WatchLaterVideo[]) => setWatchLater([...next, ...shorts]);
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [sort, setSort] = useState<Sort>("manual");

  // Drag-and-drop (only in the manual order)
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const endDrag = () => {
    dragIndex.current = null;
    setDragOverIndex(null);
  };
  const drop = (to: number) => {
    const from = dragIndex.current;
    if (from !== null && from !== to) {
      const next = [...videos];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      setVideos(next);
    }
    endDrag();
  };

  // Moving to the top or bottom always switches to the manual order
  const move = (video: WatchLaterVideo, where: "top" | "bottom") => {
    const rest = videos.filter((v) => v.id !== video.id);
    setVideos(where === "top" ? [video, ...rest] : [...rest, video]);
    setSort("manual");
  };

  const removeAction = (v: WatchLaterVideo): MenuAction => ({
    id: "remove",
    label: "Remove from Watch later",
    icon: Trash2,
    danger: true,
    onSelect: () => notify("Removed from Watch later", { undo: removeFromWatchLater(v.id), thumb: mediaThumb(v.id) }),
  });
  const videoActions = (v: WatchLaterVideo): MenuAction[] => [
    { id: "top", label: "Move to top", icon: ChevronsUp, onSelect: () => move(v, "top") },
    { id: "bottom", label: "Move to bottom", icon: ChevronsDown, onSelect: () => move(v, "bottom") },
    removeAction(v),
  ];

  const sorted = useMemo(() => (sort === "manual" ? videos : [...videos].sort(ORDER[sort])), [videos, sort]);
  const canDrag = sort === "manual";
  const cover = videos[0] ?? shorts[0];
  const playAll = () => {
    const first = sorted[0] ?? shorts[0];
    if (first) router.push(savedHref(first));
  };
  const shuffle = () => {
    const list = videos.length ? videos : shorts;
    const pick = list[Math.floor(Math.random() * list.length)];
    if (pick) router.push(savedHref(pick));
  };

  return (
    <div className="min-h-screen bg-background pt-14 md:pt-16">
      <div className="px-3 pb-8 md:px-6 md:py-6">
        {!hydrated ? null : !cover ? (
          <EmptyState as="h1" icon={Clock} title="Watch later is empty" description="Save videos to watch them later">
            <Button onClick={() => router.push("/")}>Browse videos</Button>
          </EmptyState>
        ) : (
          <LibraryPage icon={Clock} title="Watch later" videos={videos} shorts={shorts} onPlayAll={playAll} onShuffle={shuffle}>
            <LibraryChips
              videos={videos.length}
              shorts={shorts.length}
              value={filter}
              onChange={setFilter}
              before={<SortDropdown variant="chip" options={SORT_OPTIONS} currentValue={sort} onSelect={setSort} />}
            />

            {filter !== "shorts" && sorted.length > 0 && (
              <section className="mb-8">
                {filter === "all" && <LibraryTitle count={sorted.length}>Videos</LibraryTitle>}
                <div className="space-y-0.5">
                  {sorted.map((video, index) => (
                    <LibraryRow
                      key={video.id}
                      video={video}
                      index={index}
                      inWatchLater
                      extra={videoActions(video)}
                      draggable={canDrag}
                      dragOver={dragOverIndex === index}
                      onDragStart={() => {
                        dragIndex.current = index;
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverIndex(index);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        drop(index);
                      }}
                      onDragEnd={endDrag}
                    />
                  ))}
                </div>
              </section>
            )}

            {filter !== "videos" && shorts.length > 0 && (
              <section>
                {filter === "all" && <LibraryTitle count={shorts.length}>Shorts</LibraryTitle>}
                <LibraryShorts shorts={shorts} extra={(s) => [removeAction(s)]} inWatchLater />
              </section>
            )}

            {((filter === "videos" && videos.length === 0) || (filter === "shorts" && shorts.length === 0)) && (
              <EmptyState icon={Clock} title={`No ${filter} saved yet`} />
            )}
          </LibraryPage>
        )}
      </div>
    </div>
  );
}
